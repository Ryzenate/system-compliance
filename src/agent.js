const si = require('systeminformation');
const { exec } = require('child_process');
const util = require('util');
const semver = require('semver');
const fs = require('fs').promises;
const path = require('path');

const execPromise = util.promisify(exec);

async function loadMinRequirements() {
    try {
        const data = await fs.readFile(path.join(__dirname, '../minRequirements.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading minRequirements.json:', error);
        // Fallback to default requirements
        return {
            osBuild: '26100',
            biosVersion: '1.5.0',
            gpuDriver: '536.23',
            npuDriver: '31.0.16000'
        };
    }
}

async function collectSystemInfo() {
    try {
        // Load minimum requirements
        const minRequirements = await loadMinRequirements();

        // Fetch system information using systeminformation
        const osInfo = await si.osInfo();
        const biosInfo = await si.bios();
        const graphicsInfo = await si.graphics();

        // Fetch versions using PowerShell scripts
        const npuDriverVersion = await getNpuDriverVersion();
        const gpuDriverVersion = await getGpuDriverVersion();
        const windowsVersion = await getWindowsVersion();

        // Helper function to get type from component
        function getTypeFromComponent(component) {
            const componentKey = component.toLowerCase().replace(/\s/g, '');
            switch (componentKey) {
                case 'windowsosbuild':
                    return 'osBuild';
                case 'systembiosversion':
                    return 'bios';
                case 'gpudriverversion':
                    return 'gpu';
                case 'npudriverversion':
                    return 'npu';
                default:
                    return 'generic';
            }
        }

        // Helper function to get minimum requirement based on component
        function getMinRequirement(component, minRequirements) {
            const componentKey = component.toLowerCase().replace(/\s/g, '');
            switch (componentKey) {
                case 'windowsosbuild':
                    return minRequirements.osBuild;
                case 'systembiosversion':
                    return minRequirements.biosVersion;
                case 'gpudriverversion':
                    return minRequirements.gpuDriver;
                case 'npudriverversion':
                    return minRequirements.npuDriver;
                default:
                    return 'Unknown';
            }
        }

        // Robust version comparison function
        function isVersionCompliant(current, minimum, type = 'generic') {
            // Handle 'Unknown' versions
            if (current === 'Unknown' || minimum === 'Unknown') {
                return false; // Non-compliant if version is unknown
            }

            try {
                if (type === 'osBuild') {
                    // Compare OS build numbers, e.g., "26100.6584" vs "26100"
                    const [currentMajor, currentMinor] = current.split('.').map(Number);
                    const [minMajor, minMinor = 0] = minimum.split('.').map(Number); // Default minor to 0 if not provided
                    if (currentMajor > minMajor) return true;
                    if (currentMajor === minMajor && currentMinor >= minMinor) return true;
                    return false;
                } else if (type === 'gpu') {
                    // Compare multi-part versions like "32.0.21025.10016" vs "536.23"
                    // Pad shorter version to match longer one with zeros
                    const currentParts = current.split('.').map(Number);
                    const minParts = minimum.split('.').map(Number);
                    const maxLength = Math.max(currentParts.length, minParts.length);
                    const paddedCurrent = currentParts.concat(Array(maxLength - currentParts.length).fill(0));
                    const paddedMin = minParts.concat(Array(maxLength - minParts.length).fill(0));
                    for (let i = 0; i < maxLength; i++) {
                        if (paddedCurrent[i] > paddedMin[i]) return true;
                        if (paddedCurrent[i] < paddedMin[i]) return false;
                    }
                    return true; // Equal
                } else if (type === 'bios' || type === 'npu') {
                    // Try semver first
                    try {
                        return semver.gte(current, minimum);
                    } catch {
                        // Fallback to string comparison for non-standard versions like "FP7T107"
                        // Normalize versions by removing non-alphanumeric characters for comparison
                        const normalize = str => str.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
                        const currentNormalized = normalize(current);
                        const minimumNormalized = normalize(minimum);
                        // If versions are purely numeric with dots, split and compare numerically
                        if (/^\d+(\.\d+)*$/.test(current) && /^\d+(\.\d+)*$/.test(minimum)) {
                            const currentParts = current.split('.').map(Number);
                            const minParts = minimum.split('.').map(Number);
                            const maxLength = Math.max(currentParts.length, minParts.length);
                            const paddedCurrent = currentParts.concat(Array(maxLength - currentParts.length).fill(0));
                            const paddedMin = minParts.concat(Array(maxLength - minParts.length).fill(0));
                            for (let i = 0; i < maxLength; i++) {
                                if (paddedCurrent[i] > paddedMin[i]) return true;
                                if (paddedCurrent[i] < paddedMin[i]) return false;
                            }
                            return true; // Equal
                        }
                        // Otherwise, use lexicographical comparison
                        return currentNormalized >= minimumNormalized;
                    }
                } else {
                    // Use semver for generic versions
                    return semver.gte(current, minimum);
                }
            } catch (error) {
                console.error('Version comparison error:', error);
                // Fallback to string comparison
                return current >= minimum;
            }
        }

        const systemData = {
            systemName: osInfo.hostname,
            manufacturer: (await si.system()).manufacturer,
            model: (await si.system()).model,
            cpu: (await si.cpu()).brand,
            gpu: graphicsInfo.controllers[0]?.model || 'Unknown GPU',
            compliance: [
                {
                    component: 'Windows OS Build',
                    current: windowsVersion,
                    minimum: getMinRequirement('Windows OS Build', minRequirements),
                    status: isVersionCompliant(windowsVersion, minRequirements.osBuild, 'osBuild') ? 'Compliant ✔' : 'Non-Compliant ❌'
                },
                {
                    component: 'System BIOS Version',
                    current: biosInfo.version,
                    minimum: getMinRequirement('System BIOS Version', minRequirements),
                    status: isVersionCompliant(biosInfo.version, minRequirements.biosVersion, 'bios') ? 'Compliant ✔' : 'Non-Compliant ❌'
                },
                {
                    component: 'GPU Driver Version',
                    current: gpuDriverVersion,
                    minimum: getMinRequirement('GPU Driver Version', minRequirements),
                    status: isVersionCompliant(gpuDriverVersion, minRequirements.gpuDriver, 'gpu') ? 'Compliant ✔' : 'Non-Compliant ❌'
                },
                {
                    component: 'NPU Driver Version',
                    current: npuDriverVersion,
                    minimum: getMinRequirement('NPU Driver Version', minRequirements),
                    status: isVersionCompliant(npuDriverVersion, minRequirements.npuDriver, 'npu') ? 'Compliant ✔' : 'Non-Compliant ❌'
                }
            ]
        };

        // Send data to server (configure the server URL as needed)
        const serverUrl = 'http://localhost:3000'; // Change to your server IP/URL for remote
        await fetch(`${serverUrl}/api/submit-system-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(systemData)
        }).then(response => {
            if (response.ok) {
                console.log('System info sent successfully');
            } else {
                console.error('Failed to send system info');
            }
        }).catch(error => {
            console.error('Error sending system info:', error);
        });

        console.log('System Info Collected and Sent:', systemData);
    } catch (error) {
        console.error('Error collecting system info:', error);
    }
}

// Function to get Windows version by calling PowerShell script
async function getWindowsVersion() {
    try {
        const { stdout } = await execPromise('powershell -ExecutionPolicy Bypass -File "./get-WindowsVersion.ps1"');
        const version = stdout.trim();
        return version || 'Unknown';
    } catch (error) {
        console.error('Error running get-WindowsVersion.ps1:', error);
        return 'Unknown';
    }
}

// Function to get NPU driver version by calling PowerShell script
async function getNpuDriverVersion() {
    try {
        const { stdout } = await execPromise('powershell -ExecutionPolicy Bypass -File "./get-NpuDriverVer.ps1"');
        const version = stdout.trim();
        return version || 'Unknown';
    } catch (error) {
        console.error('Error running get-NpuDriverVer.ps1:', error);
        return 'Unknown';
    }
}

// Function to get GPU driver version by calling PowerShell script
async function getGpuDriverVersion() {
    try {
        const { stdout } = await execPromise('powershell -ExecutionPolicy Bypass -File "./get-GpuDriverVer.ps1"');
        const version = stdout.trim();
        return version || 'Unknown';
    } catch (error) {
        console.error('Error running get-GpuDriverVer.ps1:', error);
        return 'Unknown';
    }
}

collectSystemInfo();
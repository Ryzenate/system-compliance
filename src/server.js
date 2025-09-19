const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const semver = require('semver');
const fs = require('fs').promises;

const execPromise = util.promisify(exec);

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files (HTML front-end)
app.use(express.static(path.join(__dirname, '../public')));

// Load minimum requirements from JSON file
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

// API endpoint to get system compliance data (for local system)
app.get('/api/system-info', async (req, res) => {
    try {
        // Load minimum requirements
        const minRequirements = await loadMinRequirements();

        // Fetch system information
        const osInfo = await si.osInfo();
        const biosInfo = await si.bios();
        const graphicsInfo = await si.graphics();
        const npuDriverVersion = await getNpuDriverVersion();
        const gpuDriverVersion = await getGpuDriverVersion();
        const windowsVersion = await getWindowsVersion();

        // Gather system data
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
                    minimum: minRequirements.osBuild,
                    status: isVersionCompliant(windowsVersion, minRequirements.osBuild, 'osBuild') ? 'Compliant ✔' : 'Non-Compliant ❌'
                },
                {
                    component: 'System BIOS Version',
                    current: biosInfo.version,
                    minimum: minRequirements.biosVersion,
                    status: isVersionCompliant(biosInfo.version, minRequirements.biosVersion, 'bios') ? 'Compliant ✔' : 'Non-Compliant ❌'
                },
                {
                    component: 'GPU Driver Version',
                    current: gpuDriverVersion,
                    minimum: minRequirements.gpuDriver,
                    status: isVersionCompliant(gpuDriverVersion, minRequirements.gpuDriver, 'gpu') ? 'Compliant ✔' : 'Non-Compliant ❌'
                },
                {
                    component: 'NPU Driver Version',
                    current: npuDriverVersion,
                    minimum: minRequirements.npuDriver,
                    status: isVersionCompliant(npuDriverVersion, minRequirements.npuDriver, 'npu') ? 'Compliant ✔' : 'Non-Compliant ❌'
                }
            ]
        };

        res.json(systemData);
    } catch (error) {
        console.error('Error fetching system info:', error);
        res.status(500).json({ error: 'Failed to fetch system information' });
    }
});

// POST endpoint to accept system info from clients
app.post('/api/submit-system-info', async (req, res) => {
    try {
        const clientData = req.body;
        if (!clientData || !clientData.systemName) {
            return res.status(400).json({ error: 'Missing systemName in request body' });
        }

        // Load minimum requirements
        const minRequirements = await loadMinRequirements();

        // Process compliance data if provided
        const compliance = clientData.compliance?.map(item => ({
            component: item.component,
            current: item.current,
            minimum: item.minimum || getMinRequirement(item.component, minRequirements),
            status: isVersionCompliant(item.current, item.minimum || getMinRequirement(item.component, minRequirements), getTypeFromComponent(item.component)) ? 'Compliant ✔' : 'Non-Compliant ❌'
        })) || [];

        // Store client data (in-memory; replace with database in production)
        const clientDataStore = global.clientDataStore || (global.clientDataStore = {});
        clientDataStore[clientData.systemName] = { ...clientData, compliance };

        console.log('Received system info from client:', clientData.systemName, clientData);

        res.json({ 
            success: true, 
            message: 'System information received and processed',
            receivedData: { ...clientData, compliance }
        });
    } catch (error) {
        console.error('Error processing client data:', error);
        res.status(500).json({ error: 'Failed to process system information' });
    }
});

// GET endpoint to retrieve all client data
app.get('/api/all-system-info', (req, res) => {
    res.json(global.clientDataStore || {});
});

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

// Helper function to get type from component for version comparison
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

// Function to get Windows version by calling PowerShell script
async function getWindowsVersion() {
    try {
        const scriptPath = path.join(__dirname, 'get-WindowsVersion.ps1');
        const { stdout } = await execPromise(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
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
        const scriptPath = path.join(__dirname, 'get-NpuDriverVer.ps1');
        const { stdout } = await execPromise(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
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
        const scriptPath = path.join(__dirname, 'get-GpuDriverVer.ps1');
        const { stdout } = await execPromise(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
        const version = stdout.trim();
        return version || 'Unknown';
    } catch (error) {
        console.error('Error running get-GpuDriverVer.ps1:', error);
        return 'Unknown';
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
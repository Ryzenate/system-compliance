# PowerShell script to retrieve GPU driver version for AMD Ryzen GPUs
# Run with elevated privileges if necessary
#Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

try {
    # Query for GPU drivers using WMI, filtering for AMD devices
    $gpuDrivers = Get-WmiObject -Class Win32_PnPSignedDriver | Where-Object { 
        $_.DeviceName -like "*AMD*" -or $_.DeviceName -like "*Radeon*" -or $_.DeviceName -like "*Ryzen*"
    }
    
    if ($gpuDrivers) {
        # Get the first matching driver's version (adjust if multiple GPUs)
        $driverVersion = $gpuDrivers[0].DriverVersion
        Write-Output $driverVersion
    } else {
        Write-Output "No AMD GPU driver found"
    }
} catch {
    Write-Output "Error: $($_.Exception.Message)"
}
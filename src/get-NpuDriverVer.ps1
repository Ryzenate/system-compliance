# PowerShell script to retrieve NPU driver version
# Run with elevated privileges if necessary
#Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

try {
    # Query for NPU-related drivers using WMI
    $npuDrivers = Get-WmiObject -Class Win32_PnPSignedDriver | Where-Object { $_.DeviceName -like "*NPU*" -or $_.DeviceName -like "*Neural*" }
    
    if ($npuDrivers) {
        # Get the first matching driver's version (adjust if multiple NPUs)
        $driverVersion = $npuDrivers[0].DriverVersion
        Write-Output $driverVersion
    } else {
        Write-Output "No NPU driver found"
    }
} catch {
    Write-Output "Error: $($_.Exception.Message)"
}
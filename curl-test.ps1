# TO RUN THIS: 
# node src/agent.js

curl -X POST http://localhost:3000/api/submit-system-info -H "Content-Type: application/json" -d '{"systemName": "TestPC", "osBuild": "26100"}'
echo "Well did it work?"
pause

Invoke-WebRequest -Uri http://localhost:3000/api/submit-system-info -Method Post -Headers @{ "Content-Type" = "application/json" } -Body '{"systemName": "TestPC", "compliance": [{"component": "Windows OS Build", "current": "Version 24H2 (OS Build 26100.6584)", "minimum": "Version 24H2 (OS Build 26100)"}, {"component": "GPU Driver Version", "current": "32.0.21025.10016", "minimum": "536.23"}]}'
Invoke-WebRequest -Uri http://localhost:3000/api/submit-system-info -Method Post -Headers @{ "Content-Type" = "application/json" } -Body '{"systemName": "TestPC", "compliance": [{"component": "Windows OS Build", "current": "26100.6584", "minimum": "26100"}, {"component": "System BIOS Version", "current": "FP7T107", "minimum": "FP7T107"}, {"component": "GPU Driver Version", "current": "32.0.21025.10016", "minimum": "536.23"}, {"component": "NPU Driver Version", "current": "Unknown", "minimum": "31.0.16000"}]}'


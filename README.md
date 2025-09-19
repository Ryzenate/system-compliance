# System Compliance Monitor

A simple tool to display system compliance status for Windows OS build, BIOS version, GPU driver, and NPU driver versions. The project includes a Node.js backend and an HTML front-end, designed to run locally on a single PC.

## Features
- Displays system information (system name, manufacturer, model, CPU, GPU).
- Shows a compliance table comparing current versions against minimum requirements.
- Includes buttons to refresh data or print a report.
- Extensible for multi-PC monitoring with a client agent script.

## Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later recommended).
- A Windows PC (for accurate system information retrieval).
- Optional: Elevated permissions for BIOS or driver queries.

## Setup
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/system-compliance.git
   cd system-compliance
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Server**:
   ```bash
   npm start
   ```
   The server will start at `http://localhost:3000`.

4. **Access the Interface**:
   - Open a browser and navigate to `http://localhost:3000`.
   - The page will display system information and compliance status.

## Usage
- **Refresh**: Click the "Refresh" button to update system data.
- **Print Report**: Click the "Print Report" button to generate a printable version of the compliance status.
- **NPU Driver**: The NPU driver version is a placeholder. Replace the `getNpuDriverVersion` function in `src/server.js` with vendor-specific logic (e.g., Intel OpenVINO, AMD ROCm).

## Project Structure
- `public/index.html`: HTML front-end with JavaScript to fetch and display data.
- `src/server.js`: Node.js backend server with Express, serving system data via an API.
- `src/agent.js`: Optional client agent script for future multi-PC monitoring.
- `package.json`: Project metadata and dependencies.
- `.gitignore`: Excludes unnecessary files from Git.

## Extending to Multi-PC Monitoring
To monitor multiple PCs (e.g., via a local server or cloud VM):
1. Modify `src/server.js` to accept data from client PCs via a POST endpoint.
2. Run `src/agent.js` on each client PC to collect and send data.
3. Update the front-end to display data for multiple systems (e.g., with a dropdown).

## Notes
- **NPU Driver Retrieval**: The current implementation uses a placeholder for NPU driver versions. You may need vendor-specific tools or system commands (e.g., `wmic`) to retrieve accurate NPU data.
- **Permissions**: Some system information (e.g., BIOS) may require running the server with elevated privileges (`Run as Administrator` on Windows).

## Version Comparison
- The `isVersionCompliant` function handles non-standard BIOS versions (e.g., `FP7T107`) and `Unknown` versions gracefully.
- Update `minRequirements.json` to set appropriate minimum versions for your hardware, especially for BIOS and NPU drivers.

## License
MIT License. See `LICENSE` for details.

## Contributing
Feel free to open issues or submit pull requests on GitHub to improve the project!
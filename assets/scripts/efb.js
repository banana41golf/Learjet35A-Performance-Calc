document.addEventListener("DOMContentLoaded", async () => {
    // Declare variables for datasets
    let f8ToData, f8DisData, vrData, v2Data, n1Data, f8MTOWdata;

    // Fetch and load JSON files
    try {
        console.log("Starting to load JSON data...");
        
        f8ToData = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/F8-TO_flat.json");
        f8DisData = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/F8-DIS_flat.json");
        vrData = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/VR_flat.json");
        v2Data = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/V2_flat.json");
        n1Data = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/N1_flat.json");
        f8MTOWdata = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/f8MTOW.json");

        console.log("All data loaded successfully.");
    } catch (error) {
        console.error("Error loading JSON files:", error);
        return; // Exit if any file fails to load
    }

    // Attach event listener to the calculate button
    const calculateButton = document.querySelector("button[type='submit']");
    calculateButton.addEventListener("click", (event) => {
        event.preventDefault();
        handleCalculation(f8ToData, f8DisData, vrData, v2Data, n1Data, f8MTOWdata);
    });
});

// Utility function to fetch JSON
async function fetchJSON(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}. Status: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Invalid Content-Type for ${path}: ${contentType}`);
    }
    return response.json();
}

// Calculation handler
function handleCalculation(f8ToData, f8DisData, vrData, v2Data, n1Data, f8MTOWdata) {
    const oatInput = document.getElementById("oat");
    const gwInput = document.getElementById("gw");
    const elevationInput = document.getElementById("elevation");
    const flapsInput = document.getElementById("flaps-input");

    const oat = parseInt(oatInput.value, 10);
    const gw = parseInt(gwInput.value, 10);
    const elevation = parseInt(elevationInput.value, 10);
    const flaps = parseInt(flapsInput.value, 10);

    // Input validation
    if (isNaN(oat) || isNaN(gw) || isNaN(elevation)) {
        alert("Please ensure all inputs are valid numbers.");
        return;
    }

    console.log(`Inputs: OAT=${oat}, GW=${gw}, Elevation=${elevation}, Flaps=${flaps}`);

    // Perform calculations
    let v1, distance, n1;

    if (flaps === 8) {
        v1 = interpolateMultiDimensional(f8ToData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "V1");
        distance = interpolateMultiDimensional(f8DisData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance");
    } else {
        console.error("Flaps configuration not supported in this refactored code.");
        return;
    }

    n1 = interpolateMultiDimensional(n1Data, ["OAT", "Elevation"], [oat, elevation], "N1");

    console.log(`Results: V1=${v1}, Distance=${distance}, N1=${n1}`);

    // Update UI
    document.getElementById("v1-output").innerText = v1 ? `${Math.round(v1)} knots` : "N/A";
    document.getElementById("distance-output").innerText = distance ? `${Math.round(distance)} ft` : "N/A";
    document.getElementById("n1-output").innerText = n1 ? n1.toFixed(1) : "N/A";
}

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
    let v1, TOdistance, n1, v2;

    if (flaps === 8) {
        v1 = interpolateMultiDimensional(f8ToData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "V1");
        TOdistance = interpolateMultiDimensional(f8DisData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance");
        v2 = interpolateMultiDimensional(v2Data, ["GW"], [gw], "V2");
    } else {
        console.error("Flaps configuration not supported in this refactored code.");
        return;
    }

    n1 = interpolateMultiDimensional(n1Data, ["OAT", "Elevation"], [oat, elevation], "N1");

    console.log(`Results: V1=${v1}, Distance=${distance}, N1=${n1}, V2=${v2}`);

    // Update UI
    document.getElementById("v1-output").innerText = v1 ? `${Math.round(v1)} knots` : "N/A";
    document.getElementById("v2-output").innerText = v2 ? `${Math.round(v2)} knots` : "N/A";
    document.getElementById("distance-output").innerText = TOdistance ? `${Math.round(TOdistance)} ft` : "N/A";
    document.getElementById("n1-output").innerText = n1 ? n1.toFixed(1) : "N/A";
}

// Interpolation Function
function interpolateMultiDimensional(data, inputs, targetValues, outputField) {
    function interpolate(x1, x2, f1, f2, x) {
        if (x1 === x2) return f1; // Avoid division by zero
        return f1 + ((f2 - f1) / (x2 - x1)) * (x - x1);
    }

    function recursiveInterpolate(data, dims, targets) {
        if (dims.length === 1) {
            const [dim] = dims;
            const target = targets[0];

            const points = data
                .filter(d => d[dim] !== undefined && d[outputField] !== undefined)
                .map(d => ({ key: d[dim], value: d[outputField] }))
                .sort((a, b) => a.key - b.key);

            if (points.length < 2) {
                return undefined;
            }

            const lower = Math.max(...points.filter(p => p.key <= target).map(p => p.key));
            const upper = Math.min(...points.filter(p => p.key >= target).map(p => p.key));

            const lowerValue = points.find(p => p.key === lower)?.value;
            const upperValue = points.find(p => p.key === upper)?.value;

            return interpolate(lower, upper, lowerValue, upperValue, target);
        }

        const [dim, ...remainingDims] = dims;
        const target = targets[0];

        const lowerGroup = data.filter(d => d[dim] === Math.max(...data.map(d => d[dim]).filter(x => x <= target)));
        const upperGroup = data.filter(d => d[dim] === Math.min(...data.map(d => d[dim]).filter(x => x >= target)));

        const lowerResult = recursiveInterpolate(lowerGroup, remainingDims, targets.slice(1));
        const upperResult = recursiveInterpolate(upperGroup, remainingDims, targets.slice(1));

        return interpolate(
            Math.max(...lowerGroup.map(d => d[dim])),
            Math.min(...upperGroup.map(d => d[dim])),
            lowerResult,
            upperResult,
            target
        );
    }

    return recursiveInterpolate(data, inputs, targetValues);
}

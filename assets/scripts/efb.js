let f8ToData, f8DisData, vrData, v2Data, n1Data, f8MTOWdata, ldgDistAData, ldgDistFData;

document.addEventListener("DOMContentLoaded", async () => {
    // Declare variables for datasets


    // Fetch and load JSON files
    try {
        console.log("Starting to load JSON data...");
        f8ToData = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/F8-TO_flat.json");
        f8DisData = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/F8-DIS_flat.json");
        console.log(f8DisData);
        vrData = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/VR_flat.json");
        v2Data = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/V2_flat.json");
        n1Data = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/N1_flat.json");
        f8MTOWdata = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/f8MTOW.json");
        ldgDistAData = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/LDAA_flat_int.json");
        console.log(ldgDistAData);
        ldgDistFData = await fetchJSON("/Learjet35A-Performance-Calc/assets/data/fact_int.json");
        console.log(ldgDistFData);

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

// Interpolation Function
function interpolateMultiDimensional(data, inputs, targetValues, outputField) {
    function interpolate(x1, x2, f1, f2, x) {
        if (x1 === x2) return f1; // Avoid division by zero
        return f1 + ((f2 - f1) / (x2 - x1)) * (x - x1);
    }

    function recursiveInterpolate(data, dims, targets) {
        console.log("Recursive Step: Data length:", data?.length, "Dims:", dims, "Targets:", targets);

        // Validate data
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.error("Invalid data passed to recursiveInterpolate:", data);
            return undefined;
        }

        // Check for an exact match and return it immediately
        const exactMatch = data.find(d =>
            dims.every((dim, index) => d[dim] === targets[index])
        );
        if (exactMatch) {
            console.log("Returning Exact Match ->", exactMatch[outputField]);
            return exactMatch[outputField];
        }

        // Base case: final dimension
        if (dims.length === 1) {
            const [dim] = dims;
            const target = targets[0];

            const points = data
                .filter(d => d[dim] !== undefined && d[outputField] !== undefined)
                .map(d => ({ key: d[dim], value: d[outputField] }))
                .sort((a, b) => a.key - b.key);

            console.log("Points for final interpolation:", points);

            if (points.length < 2) {
                console.warn(`Not enough points for interpolation on dim=${dim}, target=${target}`);
                return undefined;
            }

            // Check bounds with tolerance
            const keys = points.map(p => p.key);
            const minKey = Math.min(...keys);
            const maxKey = Math.max(...keys);

            if (target < minKey - 1e-6 || target > maxKey + 1e-6) {
                console.warn(`Target ${target} out of bounds for dim=${dim} [${minKey}, ${maxKey}]`);
                return undefined;
            }

            const lower = Math.max(...points.filter(p => p.key <= target).map(p => p.key));
            const upper = Math.min(...points.filter(p => p.key >= target).map(p => p.key));

            const lowerValue = points.find(p => Math.abs(p.key - lower) < 1e-6)?.value;
            const upperValue = points.find(p => Math.abs(p.key - upper) < 1e-6)?.value;

            console.log(`Interpolating final values -> Lower: (${lower}, ${lowerValue}), Upper: (${upper}, ${upperValue}), Target: ${target}`);
            return interpolate(lower, upper, lowerValue, upperValue, target);
        }

        const [dim, ...remainingDims] = dims;
        const target = targets[0];

        // Validate target against data range
        const dimValues = data.map(d => d[dim]).filter(v => v !== undefined);
        const minValue = Math.min(...dimValues);
        const maxValue = Math.max(...dimValues);

        console.log(`Checking bounds for dim=${dim} -> Min: ${minValue}, Max: ${maxValue}, Target: ${target}`);
        if (target < minValue - 1e-6 || target > maxValue + 1e-6) {
            console.warn(`Target ${target} out of bounds for dim=${dim} [${minValue}, ${maxValue}]`);
            return undefined;
        }

        // Filter and validate groups with tolerance
        const lowerMax = Math.max(...data.map(d => d[dim]).filter(x => x <= target));
        const upperMin = Math.min(...data.map(d => d[dim]).filter(x => x >= target));
        
        console.log(`Filtering data for dim=${dim}, target=${target} -> LowerMax: ${lowerMax}, UpperMin: ${upperMin}`);
        const lowerGroup = data.filter(d => Math.abs(d[dim] - lowerMax) < 1e-6);
        const upperGroup = data.filter(d => Math.abs(d[dim] - upperMin) < 1e-6);
        
        // Debug and validate
        console.log("Filtered Groups -> Lower:", lowerGroup, "Upper:", upperGroup, "Target:", target);
        if (lowerGroup.length === 0 || upperGroup.length === 0) {
            console.error(`No valid groups found for dim=${dim}, target=${target}`);
            console.error("Original Data Length:", data.length, "Data Sample:", data.slice(0, 5));
            return undefined;
        }        

        const lowerResult = recursiveInterpolate(lowerGroup, remainingDims, targets.slice(1));
        const upperResult = recursiveInterpolate(upperGroup, remainingDims, targets.slice(1));

        console.log(`Results from recursion -> LowerResult: ${lowerResult}, UpperResult: ${upperResult}`);
        if (lowerResult === undefined || upperResult === undefined) {
            console.warn("Interpolation failed for some groups.");
            return undefined;
        }

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

// Calculation handler
function handleCalculation(f8ToData, f8DisData, vrData, v2Data, n1Data, f8MTOWdata, ldgDistAData, ldgDistFData) {
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
    let v1, TOdistance, n1, vR, v2, ldgDistAct, ldgDistFact;
    if (!ldgDistAData || !ldgDistFData) {
        console.error("Landing distance data is undefined. Check JSON fetch.");
        return;
    }
    

    if (flaps === 8) {
        v1 = interpolateMultiDimensional(f8ToData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "V1");
        TOdistance = interpolateMultiDimensional(f8DisData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance");
        vR = interpolateMultiDimensional(vrData, ["GW"], [gw], "VR");
        v2 = interpolateMultiDimensional(v2Data, ["GW"], [gw], "V2");

    } else {
        console.error("Flaps configuration not supported in this refactored code.");
        return;
    }

    n1 = interpolateMultiDimensional(n1Data, ["OAT", "Elevation"], [oat, elevation], "N1");
    ldgDistAct = interpolateMultiDimensional(ldgDistAData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance");
    ldgDistFact =  interpolateMultiDimensional(ldgDistFData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance");

    console.log(`Results: V1=${v1}, TO Distance=${TOdistance}, N1=${n1}, VR=${vR}, V2=${v2}, LDG-DIST(A)${ldgDistA}, LDG-DIST(B)${ldgDistF}`);

    // Update UI
    // Takeoff Section Items
    document.getElementById("n1-output").innerText = n1 ? n1.toFixed(1) : "N/A";
    document.getElementById("v1-output").innerText = v1 ? `${Math.round(v1)} knots` : "N/A";
    document.getElementById("vr-output").innerText = vR ? `${Math.round(vR)} knots` : "N/A";
    document.getElementById("v2-output").innerText = v2 ? `${Math.round(v2)} knots` : "N/A";
    document.getElementById("distance-output").innerText = TOdistance ? `${Math.round(TOdistance)} ft` : "N/A";

    // Landing Section Items
    document.getElementById("ldgDistA-output").innerText = ldgDistAct ? `${Math.round(ldgDistAct)} ft` : "N/A";
    document.getElementById("ldgDistF-output").innerText = ldgDistFact ? `${Math.round(ldgDistFact)} ft` : "N/A";
}
 


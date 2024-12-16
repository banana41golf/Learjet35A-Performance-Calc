document.addEventListener("DOMContentLoaded", () => {
    const calculateButton = document.querySelector("button[type='submit']");
    const zfwSlider = document.getElementById("zfw-slider");
    const zfwInput = document.getElementById("zfw");
    const fobSlider = document.getElementById("fob-slider");
    const fobInput = document.getElementById("fob");
    const gwInput = document.getElementById("gw");

    async function loadData() {
        const filePaths = {
            n1Data: "/Learjet35A-Performance-Calc/assets/data/N1_flat.json",
            f8ToData: "/Learjet35A-Performance-Calc/assets/data/F8-TO_flat.json",
            f8DisData: "/Learjet35A-Performance-Calc/assets/data/F8-DIS_flat.json",
            vrData: "/Learjet35A-Performance-Calc/assets/data/VR_flat.json",
            v2Data: "/Learjet35A-Performance-Calc/assets/data/V2_flat.json",
            vrefData: "/Learjet35A-Performance-Calc/assets/data/vref.json",
            ldaData: "/Learjet35A-Performance-Calc/assets/data/LDAA_flat.json",
            factData: "/Learjet35A-Performance-Calc/assets/data/fact.json",
            trimData: "/Learjet35A-Performance-Calc/assets/data/trim.json",
            f20ToData: "/Learjet35A-Performance-Calc/assets/data/F20-TO.json",
            f20DisData: "/Learjet35A-Performance-Calc/assets/data/F20-DIS.json",
            f20vrData: "/Learjet35A-Performance-Calc/assets/data/VR-20.json",
            f20v2Data: "/Learjet35A-Performance-Calc/assets/data/V2-20.json",
            f8MTOWdata: "/Learjet35A-Performance-Calc/assets/data/f8MTOW.json",
            f20MTOWdata: "/Learjet35A-Performance-Calc/assets/data/f20MTOW.json",
        };
    
        const data = {};
    
        try {
            console.log("Starting to load JSON data...");
            await Promise.all(
                Object.entries(filePaths).map(async ([key, path]) => {
                    try {
                        console.log(`Fetching ${path}...`);
                        const response = await fetch(path);
    
                        if (!response.ok) {
                            throw new Error(`Failed to fetch ${path}. Status: ${response.status}`);
                        }
    
                        const contentType = response.headers.get("content-type");
                        if (!contentType || !contentType.includes("application/json")) {
                            throw new Error(`Invalid Content-Type for ${path}: ${contentType}`);
                        }
    
                        data[key] = await response.json();
                        console.log(`Loaded ${key}:`, data[key]?.slice(0, 2)); // Log first two entries as a sample
                    } catch (error) {
                        console.error(`Error loading ${key} from ${path}:`, error);
                        data[key] = []; // Assign an empty array as fallback
                    }
                })
            );
            console.log("All data loaded successfully:", data);
        } catch (error) {
            console.error("Critical error during data loading:", error);
        }
    
        return data; // Return the loaded data object
    }
    

    document.addEventListener("DOMContentLoaded", async () => {
        const loadedData = await loadData();
    
        // Example: Access loaded datasets
        console.log("N1 Data:", loadedData.n1Data);
        console.log("F8 Takeoff Data:", loadedData.f8ToData);
    
        // Perform calculations or interpolations using `loadedData`
        // Example:
        const oat = 15;
        const elevation = 1500;
        const gw = 14500;
    
        const f8Distance = interpolateMultiDimensional(
            loadedData.f8DisData, 
            ["OAT", "Elevation", "GW"], 
            [oat, elevation, gw], 
            "Distance"
        );
        console.log("F8 Takeoff Distance:", f8Distance);
    });
        


    // Interpolation Function with Debugging
    function interpolateMultiDimensional(data, inputs, targetValues, outputField) {
        function interpolate(x1, x2, f1, f2, x) {
            if (x1 === x2) return f1; // Avoid division by zero
            return f1 + ((f2 - f1) / (x2 - x1)) * (x - x1);
        }

        function recursiveInterpolate(data, dims, targets) {
            console.log(`Recursive Interpolate - Data Length: ${data.length}, Dims: ${dims}, Targets: ${targets}`);
            if (dims.length === 1) {
                const [dim] = dims;
                const target = targets[0];

                // Check for exact match
                const exactMatch = data.find(d => d[dim] === target);
                if (exactMatch) {
                    console.log(`Exact match found for ${dim}=${target}:`, exactMatch);
                    return exactMatch[outputField];
                }

                // Linear interpolation
                const points = data
                    .filter(d => d[dim] !== undefined && d[outputField] !== undefined)
                    .map(d => ({ key: d[dim], value: d[outputField] }))
                    .sort((a, b) => a.key - b.key);

                console.log(`Points for ${dim}:`, points);

                if (points.length < 2) {
                    console.warn(`Not enough points to interpolate for ${dim}`);
                    return undefined;
                }

                const lower = Math.max(...points.filter(p => p.key <= target).map(p => p.key));
                const upper = Math.min(...points.filter(p => p.key >= target).map(p => p.key));

                console.log(`Bounds for ${dim}: Lower=${lower}, Upper=${upper}`);

                if (lower === -Infinity || upper === Infinity) {
                    console.warn(`Target ${target} is out of bounds for ${dim}`);
                    return undefined;
                }

                const lowerValue = points.find(p => p.key === lower)?.value;
                const upperValue = points.find(p => p.key === upper)?.value;

                return interpolate(lower, upper, lowerValue, upperValue, target);
            }

            const [dim, ...remainingDims] = dims;
            const target = targets[0];

            // Check for exact match in current dimension
            const exactMatches = data.filter(d => d[dim] === target);
            if (exactMatches.length > 0) {
                console.log(`Exact matches found for ${dim}=${target}:`, exactMatches);
                return recursiveInterpolate(exactMatches, remainingDims, targets.slice(1));
            }

            const groups = [...new Set(data.map(d => d[dim]))]
                .filter(key => key !== undefined)
                .sort((a, b) => a - b);

            console.log(`Groups for ${dim}:`, groups);

            const lower = Math.max(...groups.filter(g => g <= target));
            const upper = Math.min(...groups.filter(g => g >= target));

            console.log(`Bounds for ${dim}: Lower=${lower}, Upper=${upper}`);

            if (lower === -Infinity || upper === Infinity) {
                console.warn(`Target ${target} is out of bounds for ${dim}`);
                return undefined;
            }

            const lowerGroup = data.filter(d => d[dim] === lower);
            const upperGroup = data.filter(d => d[dim] === upper);

            console.log(`Lower Group (${dim}=${lower}):`, lowerGroup);
            console.log(`Upper Group (${dim}=${upper}):`, upperGroup);

            const lowerResult = recursiveInterpolate(lowerGroup, remainingDims, targets.slice(1));
            const upperResult = recursiveInterpolate(upperGroup, remainingDims, targets.slice(1));

            return interpolate(lower, upper, lowerResult, upperResult, target);
        }

        if (!Array.isArray(data) || data.length === 0) {
            console.error("Data must be a non-empty array:", data);
            return undefined;
        }
        if (!inputs.every(input => input in data[0])) {
            console.error(`One or more inputs not found in data: ${inputs}`, data[0]);
            return undefined;
        }

        return recursiveInterpolate(data, inputs, targetValues);
    }

    // Calculate Button
    calculateButton.addEventListener("click", (event) => {
    event.preventDefault();
    //resetAllInfoIcons(); // Reset all info icons
    const oat = parseInt(document.getElementById("oat").value, 10); // Set OAT
    const gw = parseInt(gwInput.value, 10); // Set Gross Weight (GW)
    const elevationText = document.getElementById("elevation").value; // Set Elevation
    const elevation = parseInt(elevationText, 10); // Set Elevation (Int)
    const pmac = parseInt(document.getElementById("mac-input").textContent, 10); // Set % of MAC
    const flapsinput = parseInt(document.getElementById("flaps-input").value, 10); // Set Flaps (8 or 20)
    const userMAC = parseInt(document.getElementById("mac-input").value, 10);
    
// Check if elevation is valid
    if (isNaN(elevation)) {
      console.error("Elevation is not valid:", elevation);
      alert("Elevation is not valid.");
      return;
    }

// Check if oat is valid
    if (isNaN(oat)) {
      console.error("OAT is not valid:", oat);
      alert("OAT is not valid!");
      return;
    }

// Check if MAC is within limits (5-30)
if (isNaN(userMAC)) {
  console.error("MAC is not valid:", userMAC);
  alert("%MAC is not valid!");
  return;
    }

// Check if MAC is valid
    if (userMAC < 5 || userMAC > 30) {
      console.error("% of MAC must be between 5.0% and 30.0%");
      alert("% of MAC must be between 5.0% and 30.0%");
      return;
    }

// Log Calculation Inputs
console.log(`OAT: ${oat}, GW: ${gw}, Elevation ${elevation}, MAC: ${pmac}, Flaps: ${flapsinput}`);


// Calculations Here

// Check if Flaps 8 or 20 and pull data set accordingly
if (flapsinput === 8) {
    v1 = interpolateMultiDimensional(data.f8ToData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "V1");
    distance = interpolateMultiDimensional(data.f8DisData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance");
    vr = interpolateMultiDimensional(data.vrData, ["GW"], [gw], "VR");
    v2 = interpolateMultiDimensional(data.v2Data, ["GW"], [gw], "V2");
    rtow = interpolateMultiDimensional(data.f8MTOWdata, ["OAT", "Elevation"], [oat, elevation], "MTOW");

} else {
    v1 = interpolateMultiDimensional(data.f20ToData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "V1");
    distance = interpolateMultiDimensional(data.f20DisData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance");
    vr = interpolateMultiDimensional(data.f20vrData, ["GW"], [gw], "VR");
    v2 = interpolateMultiDimensional(data.f20v2Data, ["GW"], [gw], "V2");
    rtow = interpolateMultiDimensional(data.f20MTOWdata, ["OAT", "Elevation"], [oat, elevation], "MTOW");
}

// Perform Other Calcs
const n1 = interpolateMultiDimensional(data.n1Data, ["OAT", "Elevation"], [oat, elevation], "N1");
const vref = interpolateMultiDimensional(data.f20v2Data, ["GW"], [gw], "VREF");
const ldaa = interpolateMultiDimensional(data.ldaData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance");
const fact = interpolateMultiDimensional(data.factData, ["OAT", "Elevation", "GW"], [oat, elevation, gw], "Distance");
const trimResult = interpolateMultiDimensional(data.trimData, ["MAC"], [userMAC], "TRIM");


// Update RTOW form
    document.getElementById("rtow-input").innerText = rtow ? `${Math.round(rtow)} lbs` : "N/A";
//Update HTML forms
    document.getElementById("n1-output").innerText = n1 ? n1.toFixed(1) : "N/A";
    document.getElementById("distance-output").innerText = distance ? `${Math.round(distance)} ft` : "N/A";
    document.getElementById("v1-output").innerText = v1 ? `${Math.round(v1)} knots` : "N/A";
    document.getElementById("vref-output").innerText = vref ? `${Math.round(vref)} knots` : "N/A";
    document.getElementById("ldaa-output").innerText = ldaa ? `${Math.round(ldaa)} feet` : "N/A";
    document.getElementById("fact-output").innerText = fact ? `${Math.round(fact)} feet` : "N/A";
    document.getElementById("trim-output").innerText = trimResult ? trimResult.toFixed(1) : "N/A";
// Calculate and populate Vapp (Vref + Gust Factor)
    const gustFactor = parseInt(document.getElementById("gust-factor").value);
    const vapp = gustFactor + vref
    document.getElementById("vapp-output").innerText = vapp ? `${Math.round(vapp)} knots` : "N/A";

});

});

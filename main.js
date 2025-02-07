// Import necessary modules
import * as THREE from './build/three.module.js';
import Stats from './build/stats.module.js';
import { GLTFLoader } from './build/GLTFLoader.js';
import { PMREMGenerator } from './build/PMREMGenerator.js';
import { DRACOLoader } from './build/DRACOLoader.js';
import { PMREMCubeUVPacker } from './build/PMREMCubeUVPacker.js';
import { CarControls } from './build/CarControls.js';


// Global variables
var camera, scene, renderer, stats, carModel, materialsLib, envMap;
var bodyMatSelect = document.getElementById('body-mat');
var rimMatSelect = document.getElementById('rim-mat');
var glassMatSelect = document.getElementById('glass-mat');
var followCamera = document.getElementById('camera-toggle');
var clock = new THREE.Clock();
var carControls = new CarControls();
carControls.turningRadius = 75;

// Enhanced engine simulation class
class EngineSimulation {
  constructor() {
    // Engine characteristics
    this.idleRPM = 800;
    this.maxRPM = 8500;
    this.redlineRPM = 8000;
    this.currentRPM = this.idleRPM;
    
    // Enhanced throttle characteristics
    this.throttlePosition = 0;
    this.throttleMap = {
      initial: 0.25,    // Initial response (0-20% pedal)
      mid: 0.5,         // Mid-range response (20-80% pedal)
      top: 0.75         // Top-end response (80-100% pedal)
    };
    this.throttleInertia = 0.15;  // Base throttle response rate

    // Dynamic throttle response based on RPM
    this.rpmThrottleInfluence = {
      low: 1.2,         // Multiplier for low RPM (below 3000)
      mid: 1.0,         // Multiplier for mid RPM (3000-6000)
      high: 0.8         // Multiplier for high RPM (above 6000)
    };
    
    // Engine inertia simulation
    this.engineInertia = 0.2;
    this.engineBraking = 0.1;
    
    // Transmission
    this.gearRatios = [3.82, 2.15, 1.56, 1.21, 0.97, 0.85];
    this.currentGear = 1;
    this.finalDriveRatio = 3.44;
    this.clutchEngaged = false;
    
    // Performance characteristics
    this.powerBand = {
      start: 2500,
      peak: 6800,
      end: 8000
    };
    
    // Temperature simulation
    this.engineTemp = 20;  // Starting at ambient temperature
    this.optimalTemp = 90; // Optimal operating temperature in Celsius
    this.maxTemp = 120;    // Maximum safe temperature
  }

  getThrottleResponse(rpm, throttleInput) {
    // Get base throttle response rate based on pedal position
    let responseRate;
    if (throttleInput <= 0.2) {
      responseRate = this.throttleMap.initial;
    } else if (throttleInput <= 0.8) {
      responseRate = this.throttleMap.mid;
    } else {
      responseRate = this.throttleMap.top;
    }
    
    // Adjust response based on RPM
    let rpmMultiplier;
    if (rpm < 3000) {
      rpmMultiplier = this.rpmThrottleInfluence.low;
    } else if (rpm < 6000) {
      rpmMultiplier = this.rpmThrottleInfluence.mid;
    } else {
      rpmMultiplier = this.rpmThrottleInfluence.high;
    } 
    
    // Temperature influence on throttle response
    const tempInfluence = this.getTemperatureInfluence();
    
    return responseRate * rpmMultiplier * tempInfluence;
  }

  getTemperatureInfluence() {
    if (this.engineTemp < this.optimalTemp) {
      // Cold engine - reduced response
      return 0.8 + (0.2 * (this.engineTemp / this.optimalTemp));
    } else if (this.engineTemp > this.maxTemp) {
      // Overheating - significantly reduced response
      return Math.max(0.6, 1 - ((this.engineTemp - this.maxTemp) / 50));
    }
    // Optimal temperature range
    return 1.0;
  }


  updateTemperature(delta, throttlePosition) {
    // Temperature increases with throttle and RPM
    const heatGeneration = (this.currentRPM / this.maxRPM) * throttlePosition * 10;
    // Cooling based on airflow (speed) and ambient cooling
    const cooling = 5 * delta;
    
    this.engineTemp += (heatGeneration - cooling) * delta;
    this.engineTemp = Math.max(20, Math.min(this.engineTemp, 130));
  }

  updateEngine(delta, speed, throttleInput) {
    // Get dynamic throttle response
    const throttleResponse = this.getThrottleResponse(this.currentRPM, Math.abs(throttleInput));
    
    // Update throttle position with dynamic response
    console.log(`Target Throttle INput: ${throttleInput}`);
    const targetThrottle = Math.max(0, Math.min(1, throttleInput));
    this.throttlePosition += (targetThrottle - this.throttlePosition) * 
                            throttleResponse * (1 / delta);

    console.log(`Target Throttle: ${targetThrottle}`);
    console.log(`Throttle Response: ${throttleResponse}`);
    console.log(`Throttle Position: ${this.throttlePosition}`);
   
    // Update engine temperature
    this.updateTemperature(delta, this.throttlePosition);
    
    let targetRPM = this.idleRPM;
    
    if (speed > 0.1 || (this.throttlePosition > 0 && !this.clutchEngaged)) {
      if (speed > 0.1) {
        const wheelRPM = (speed * 60) / (2 * Math.PI * 0.33);
        const currentGearRatio = this.gearRatios[this.currentGear - 1];
        const baseRPM = wheelRPM * currentGearRatio * this.finalDriveRatio;
        
        targetRPM = Math.max(baseRPM, this.idleRPM);
        
        if (this.throttlePosition > 0) {
          // Dynamic power delivery based on temperature and RPM
          const tempInfluence = this.getTemperatureInfluence();
          const rpmEfficiency = this.getRPMEfficiency();
          targetRPM += (this.maxRPM - targetRPM) * 
                      this.throttlePosition * 
                      tempInfluence * 
                      rpmEfficiency;
        }
      } else {
        targetRPM = this.idleRPM + 
                   (this.maxRPM - this.idleRPM) * 
                   this.throttlePosition * 
                   this.getTemperatureInfluence();
      }
    } else {
      targetRPM = this.idleRPM;
    }
    
    // RPM limiting
    targetRPM = Math.min(targetRPM, this.maxRPM);
    
    // Apply engine inertia
    const rpmDifference = targetRPM - this.currentRPM;
    const inertiaFactor = this.throttlePosition > 0 ? 
                         this.engineInertia : 
                         this.engineInertia + this.engineBraking;
                         
    this.currentRPM += rpmDifference * (1 - inertiaFactor) * (1 / delta);
    this.currentRPM = Math.max(this.currentRPM, this.idleRPM);
    
    // Add dynamic idle fluctuation based on temperature
    if (speed < 0.1 && this.currentRPM < this.idleRPM + 200) {
      const tempFactor = Math.max(0.5, 1 - (this.engineTemp / this.optimalTemp));
      this.currentRPM += (Math.random() - 0.5) * 20 * tempFactor;
    }
    
    // Calculate power output
    const powerOutput = this.calculatePowerOutput();

    // Log throttle position for debugging
    console.log('Throttle Position NOW:', this.throttlePosition);

    
    return {
      rpm: Math.round(this.currentRPM),
      throttle: this.throttlePosition,
      power: powerOutput,
      gear: this.currentGear,
      temperature: Math.round(this.engineTemp)
    };
  }

  getRPMEfficiency() {
    // Calculate efficiency based on RPM range
    if (this.currentRPM < this.powerBand.start) {
      return 0.7 + (0.3 * (this.currentRPM / this.powerBand.start));
    } else if (this.currentRPM <= this.powerBand.peak) {
      return 1.0;
    } else {
      return 1.0 - (0.3 * ((this.currentRPM - this.powerBand.peak) / 
             (this.maxRPM - this.powerBand.peak)));
    }
  }

  calculatePowerOutput() {
    let powerOutput = 0;
    if (this.currentRPM >= this.powerBand.start) {
      if (this.currentRPM <= this.powerBand.peak) {
        powerOutput = (this.currentRPM - this.powerBand.start) / 
                     (this.powerBand.peak - this.powerBand.start);
      } else {
        powerOutput = 1 - (this.currentRPM - this.powerBand.peak) / 
                     (this.powerBand.end - this.powerBand.peak);
      }
      powerOutput = Math.max(0, Math.min(1, powerOutput));
      
      // Apply temperature and throttle modifiers
      powerOutput *= this.getTemperatureInfluence() * this.throttlePosition;
    }
    
    return powerOutput;
  }
  
  updateGear(speed) {
    // Enhanced gear selection logic
    const prevGear = this.currentGear;
    
    if (speed < 5 && this.currentGear > 1) {
      this.currentGear = 1;
      this.clutchEngaged = true;
    } else if (this.currentRPM > 7000 && this.currentGear < 6) {
      this.currentGear++;
      this.clutchEngaged = true;
    } else if (this.currentRPM < 2000 && this.currentGear > 1) {
      this.currentGear--;
      this.clutchEngaged = true;
    } else {
      this.clutchEngaged = false;
    }
    
    // Simulate gear shift delay
    if (prevGear !== this.currentGear) {
      this.currentRPM *= 0.85; // RPM drop during gear change
    }
  }
}

var engineSim = new EngineSimulation();

var carParts = {
  body: [],
  rims: [],
  glass: [],
};

var damping = 5.0;
var distance = 5;
var cameraTarget = new THREE.Vector3();

// Physics simulation variables
var engineRPM = 0;
var throttlePosition = 0;
var gForces = { Gx: 0, Gy: 0, Gz: 0 };
var lastUpdateTime = Date.now();

// API endpoint for sending data
const API_URL = 'https://carriskinsurancemodel-production.up.railway.app/riskmodel/predict/';

// Function to calculate G-forces
function calculateGForces(accelerationX, accelerationY, accelerationZ) {
  const gravity = 9.81;
  return {
    Gx: (accelerationX || 0) / gravity,
    Gy: (accelerationY || 0) / gravity,
    Gz: (accelerationZ || 0) / gravity,
  };
}

function formatThrottleValue(throttle) {
  const throttleString = String(throttle);
  const cleanThrottleString = throttleString.replace(/e[+\-0-9]+/i, ""); // Remove exponential notation

  if (cleanThrottleString.length > 7) {
    const isNegative = cleanThrottleString.startsWith('-');
    const absThrottleString = isNegative ? cleanThrottleString.slice(1) : cleanThrottleString;

    let formattedValue;
    if (absThrottleString.includes('.')) {
      const [integerPart, decimalPart] = absThrottleString.split('.');
      const formattedDecimalPart = decimalPart.slice(0, 2); // Truncate to 2 decimal places

      let allowedIntegerDigits = 7 - formattedDecimalPart.length;

      if(allowedIntegerDigits < 0){
        allowedIntegerDigits = 0;
      }

      const truncatedIntegerPart = integerPart.slice(0, allowedIntegerDigits);

      formattedValue = `${isNegative ? '-' : ''}${truncatedIntegerPart}.${formattedDecimalPart}`;

      if(formattedValue.length > 7){
        formattedValue = `${isNegative ? '-' : ''}${integerPart.slice(0, allowedIntegerDigits-1)}.${formattedDecimalPart.slice(0, 7 - integerPart.slice(0, allowedIntegerDigits-1).length)}`;
      }

    } else {
      formattedValue = `${isNegative ? '-' : ''}${absThrottleString.slice(0, 7)}`;
    }
    return parseFloat(formattedValue);
  } else {
    const throttleStringWithTwoDecimals = parseFloat(throttle).toFixed(2);
    return parseFloat(throttleStringWithTwoDecimals); // Ensure it's a number
  }
}

// Function to gather and send data to the API
function gatherAndSendData() {
  let formattedThrottle = parseFloat(throttlePosition.toFixed(2));

  formattedThrottle = formatThrottleValue(formattedThrottle);

  const data = {
    engine_rpm: engineRPM,
    g_x: gForces.Gx,
    g_y: gForces.Gy,
    g_z: gForces.Gz,
    throttle_position: formattedThrottle,
  };

  sendDataToAPI(data);
}

// Function to send data to the API
function sendDataToAPI(data) {
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then(response => response.json())
    .then(result => {
      console.log('Data sent successfully:', result);
      // Assuming the API returns a risk percentage in the response
      const riskPercentage = result.risk_percentage;
      updateRiskDisplay(riskPercentage);
    })
    .catch(error => console.error('Error sending data:', error));
}

// Function to update the risk display on the frontend
function updateRiskDisplay(riskPercentage) {
  document.getElementById('risk-display').textContent = `Risk: ${riskPercentage}%`;
}

// Call the gatherAndSendData function at regular intervals (e.g., every 5 seconds)
setInterval(gatherAndSendData, 5000);

// Update function
// Update function
function update() {
  var delta = clock.getDelta();
  if (carModel) {
    carControls.update(delta / 3);

    // Get car physics data
    const speed = carControls.speed || 0;
    const throttleInput = carControls.moveForward ? 1 : (carControls.moveBackward ? -1 : 0);
    const acceleration = carControls.getAcceleration();

    // Log moveForward and moveBackward for debugging
    console.log('moveForward:', carControls.moveForward);
    console.log('moveBackward:', carControls.moveBackward);

    // Log throttle input for debugging
    console.log('Throttle Input Now:', throttleInput);

    // Update engine simulation
    const engineState = engineSim.updateEngine(delta, Math.abs(speed), Math.abs(throttleInput));
    engineSim.updateGear(Math.abs(speed));
    engineRPM = engineState.rpm;
    throttlePosition = engineState.throttle;

    // Log throttle position for debugging
    console.log('Throttle Position in Update:', throttlePosition);

    // Calculate G-forces
    gForces = calculateGForces(
      acceleration.x,
      acceleration.y,
      acceleration.z
    );

    // Log G-forces for debugging
    console.log('G-forces:', gForces);

    // Update throttle display
    document.getElementById('throttle-display').textContent = 
      `Throttle: ${(engineState.throttle * 100).toFixed(1)}%`;

    // Update front-end display
    document.getElementById('engine-rpm').textContent = 
      `Engine RPM: ${engineState.rpm} | Gear: ${engineState.gear} | Temp: ${engineState.temperature}°C`;
    document.getElementById('gforces').textContent = 
      `G-forces: X=${gForces.Gx.toFixed(2)} (lateral), Y=${gForces.Gy.toFixed(2)} (vertical), Z=${gForces.Gz.toFixed(2)} (forward/back)`;

    // Reset car position if it goes too far
    if (carModel.position.length() > 200) {
      carModel.position.set(0, 0, 0);
      carControls.speed = 0;
      engineSim.currentRPM = engineSim.idleRPM;
    }

    // Camera follow logic
    if (followCamera.checked) {
      carModel.getWorldPosition(cameraTarget);
      cameraTarget.y = 2.5;
      cameraTarget.z += distance;
      camera.position.lerp(cameraTarget, delta * damping);
    } else {
      carModel.getWorldPosition(cameraTarget);
      cameraTarget.y += 0.5;
      camera.position.set(3.25, 2.0, -5);
    }
    camera.lookAt(carModel.position);
  }
  stats.update();
}

// Initialize function
function init() {
  var container = document.getElementById('container');

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(3.25, 2.0, -5);
  camera.lookAt(0, 0.5, 0);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd7cbb1, 1, 80);

  var urls = ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'];
  var loader = new THREE.CubeTextureLoader().setPath(`textures/cube/skyboxsun25deg/`);
  loader.load(urls, function (texture) {
    scene.background = texture;
    var pmremGenerator = new PMREMGenerator(texture);
    pmremGenerator.update(renderer);
    var pmremCubeUVPacker = new PMREMCubeUVPacker(pmremGenerator.cubeLods);
    pmremCubeUVPacker.update(renderer);
    envMap = pmremCubeUVPacker.CubeUVRenderTarget.texture;
    pmremGenerator.dispose();
    pmremCubeUVPacker.dispose();

    initCar();
    initMaterials();
    initMaterialSelectionMenus();
  });

  var ground = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(2400, 2400),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.15, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.renderOrder = 1;
  scene.add(ground);

  var grid = new THREE.GridHelper(400, 40, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.depthWrite = false;
  grid.material.transparent = true;
  scene.add(grid);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.gammaOutput = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  // Add HTML elements for displaying data
  const infoDiv = document.createElement('div');
  infoDiv.style.position = 'absolute';
  infoDiv.style.top = '10px';
  infoDiv.style.left = '10px';
  infoDiv.style.color = 'white';
  infoDiv.style.fontFamily = 'Arial, sans-serif';
  infoDiv.innerHTML = `
    <div id="engine-rpm">Engine RPM: 0 | Gear: 1</div>
    <div id="gforces">G-forces: X=0.00, Y=0.00, Z=0.00</div>
    <div id="throttle">Throttle Position: 0%</div>
  `;
  document.body.appendChild(infoDiv);

  window.addEventListener('resize', onWindowResize, false);

  renderer.setAnimationLoop(function () {
    update();
    renderer.render(scene, camera);
  });
}

// Initialize car model
function initCar() {
  DRACOLoader.setDecoderPath(`js/libs/draco/gltf/`);
  var loader = new GLTFLoader();
  loader.setDRACOLoader(new DRACOLoader());
  loader.load(`models/ferrari.glb`, function (gltf) {
    carModel = gltf.scene.children[0];
    carControls.setModel(carModel);
    carModel.traverse(function (child) {
      if (child.isMesh) {
        child.material.envMap = envMap;
      }
    });

    var texture = new THREE.TextureLoader().load(`models/ferrari_ao.png`);
    var shadow = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(0.655 * 4, 1.3 * 4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: texture, opacity: 0.8, transparent: true })
    );
    shadow.renderOrder = 2;
    carModel.add(shadow);

    scene.add(carModel);

    carParts.body.push(carModel.getObjectByName('body'));
    carParts.rims.push(
      carModel.getObjectByName('rim_fl'),
      carModel.getObjectByName('rim_fr'),
      carModel.getObjectByName('rim_rr'),
      carModel.getObjectByName('rim_rl'),
      carModel.getObjectByName('trim')
    );
    carParts.glass.push(carModel.getObjectByName('glass'));

    updateMaterials();
  });
}

// Initialize materials
function initMaterials() {
  materialsLib = {
    main: [
      new THREE.MeshStandardMaterial({ color: 0xff4400, envMap: envMap, metalness: 0.9, roughness: 0.2, name: 'orange' }),
      new THREE.MeshStandardMaterial({ color: 0x001166, envMap: envMap, metalness: 0.9, roughness: 0.2, name: 'blue' }),
      new THREE.MeshStandardMaterial({ color: 0x990000, envMap: envMap, metalness: 0.9, roughness: 0.2, name: 'red' }),
      new THREE.MeshStandardMaterial({ color: 0x000000, envMap: envMap, metalness: 0.9, roughness: 0.5, name: 'black' }),
      new THREE.MeshStandardMaterial({ color: 0xffffff, envMap: envMap, metalness: 0.9, roughness: 0.5, name: 'white' }),
      new THREE.MeshStandardMaterial({ color: 0x555555, envMap: envMap, envMapIntensity: 2.0, metalness: 1.0, roughness: 0.2, name: 'metallic' }),
    ],
    glass: [
      new THREE.MeshStandardMaterial({ color: 0xffffff, envMap: envMap, metalness: 1, roughness: 0, opacity: 0.2, transparent: true, premultipliedAlpha: true, name: 'clear' }),
      new THREE.MeshStandardMaterial({ color: 0x000000, envMap: envMap, metalness: 1, roughness: 0, opacity: 0.2, transparent: true, premultipliedAlpha: true, name: 'smoked' }),
      new THREE.MeshStandardMaterial({ color: 0x001133, envMap: envMap, metalness: 1, roughness: 0, opacity: 0.2, transparent: true, premultipliedAlpha: true, name: 'blue' }),
    ],
  };
}

// Initialize material selection menus
function initMaterialSelectionMenus() {
  function addOption(name, menu) {
    var option = document.createElement('option');
    option.text = name;
    option.value = name;
    menu.add(option);
  }

  materialsLib.main.forEach(function (material) {
    addOption(material.name, bodyMatSelect);
    addOption(material.name, rimMatSelect);
  });

  materialsLib.glass.forEach(function (material) {
    addOption(material.name, glassMatSelect);
  });

  bodyMatSelect.selectedIndex = 3;
  rimMatSelect.selectedIndex = 5;
  glassMatSelect.selectedIndex = 0;

  bodyMatSelect.addEventListener('change', updateMaterials);
  rimMatSelect.addEventListener('change', updateMaterials);
  glassMatSelect.addEventListener('change', updateMaterials);
}

// Update materials based on selection
function updateMaterials() {
  var bodyMat = materialsLib.main[bodyMatSelect.selectedIndex];
  var rimMat = materialsLib.main[rimMatSelect.selectedIndex];
  var glassMat = materialsLib.glass[glassMatSelect.selectedIndex];

  carParts.body.forEach(part => (part.material = bodyMat));
  carParts.rims.forEach(part => (part.material = rimMat));
  carParts.glass.forEach(part => (part.material = glassMat));
}

// Resize handler
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
import axios from 'axios';

//////////////////////////////////////////////////////////////////////
////////////////////////     CLASSES     /////////////////////////////
//////////////////////////////////////////////////////////////////////

// Assuming specific heat capacity of water is 4.186 J/g°C -> https://brainly.com/question/6363778
const SPECIFIC_HEAT_CAPACITY = 4.186;

// How many hours between each weather update (based on data provided by the OpenWeatherMap API)
const WEATHER_HOUR_RATE = 3;

// How many total hours we are simulating
const SIM_TOTAL_HOURS = 24;

class SolarPanel {
    private efficiency: number;
    private energy: number;
    private lossFactor: number;
    private temperatureCoefficient: number; // Efficiency loss per degree C above 25°C
    private incomingWaterTemperature: number;
    private area: number;

    constructor(efficiency: number, lossFactor: number, energy: number, temperatureCoefficient: number, incomingWaterTemperature: number, area: number) {
        this.efficiency = efficiency;
        this.energy = energy;
        this.lossFactor = lossFactor;
        this.temperatureCoefficient = temperatureCoefficient;
        this.incomingWaterTemperature = incomingWaterTemperature;
        this.area = area;
    }

    public absorbEnergy(solarIrradiance: number, temperature: number, timeOfDay: number): void {
        // Adjust efficiency based on temperature (standard test condition: 25°C)
        const tempEfficiencyAdjustment = 1 - (temperature - 25) * (this.temperatureCoefficient * 0.01);
        const adjustedEfficiency = this.efficiency * tempEfficiencyAdjustment;

        // Adjust solar irradiance based on time of day (simplified model)
        const timeAdjustmentFactor = Math.sin(Math.PI * timeOfDay / SIM_TOTAL_HOURS); // Peaks at noon
        const adjustedSolarIrradiance = solarIrradiance * timeAdjustmentFactor;

        // Calculate power absorbed (W) and convert to energy (J) over 3 hours
        const powerAbsorbed = adjustedSolarIrradiance * this.area * adjustedEfficiency;
        const secondsInHour = 3600;
        const energyAbsorbed = powerAbsorbed * secondsInHour * WEATHER_HOUR_RATE;

        this.energy += energyAbsorbed;
        this.energy -= this.energy * this.lossFactor; // Energy loss
        this.updateWaterTemperature(energyAbsorbed);
    }

    private updateWaterTemperature(energyAbsorbed: number): void {
        const waterMass = 1; // Assuming 1 kg of water for simplicity
        const temperatureIncrease = energyAbsorbed / (waterMass * SPECIFIC_HEAT_CAPACITY);
        this.incomingWaterTemperature += temperatureIncrease;
    }

    public transferEnergy(): { energy: number; waterTemperature: number } {
        const energyToTransfer = this.energy;
        const heatedWaterTemperature = this.incomingWaterTemperature;
        this.energy = 0; // Reset energy after transfer
        this.incomingWaterTemperature = 0; // Reset water temperature after transfer
        return { energy: energyToTransfer, waterTemperature: heatedWaterTemperature };
    }

    public setIncomingWaterTemperature(temperature: number): void {
        this.incomingWaterTemperature = temperature;
    }
}

class Pump {
    private efficiency: number;

    constructor(efficiency: number) {
        this.efficiency = efficiency;
    }

    public transferEnergy(energy: number, waterTemperature: number, storageTank: StorageTank): void {
        const transferredEnergy = energy * this.efficiency;
        storageTank.storeEnergy(transferredEnergy, waterTemperature);
    }
}

class StorageTank {
    private storedEnergy: number;
    private temperature: number;
    private heatLossRate: number;
    private waterMass: number;
    private ambientTemperature: number;

    constructor(heatLossRate: number, waterMass: number, initialTemperature: number, ambientTemperature: number, storedEnergy: number) {
        this.storedEnergy = storedEnergy;
        this.temperature = initialTemperature;
        this.heatLossRate = heatLossRate;
        this.waterMass = waterMass;
        this.ambientTemperature = ambientTemperature;
    }

    public storeEnergy(energy: number, waterTemperature: number): void {
        this.storedEnergy += energy;
        this.updateTemperature(waterTemperature);
    }

    public getStoredEnergy(): number {
        return this.storedEnergy;
    }

    public applyHeatLoss(): void {
        const heatLoss = this.heatLossRate * (this.temperature - this.ambientTemperature);
        this.storedEnergy -= heatLoss;
        this.storedEnergy = Math.max(this.storedEnergy, 0);

        this.updateTemperature();
    }

    private updateTemperature(waterTemperature?: number): void {
        if (this.waterMass > 0) {
            const waterMassCapacity = this.waterMass * SPECIFIC_HEAT_CAPACITY;
            if (waterTemperature !== undefined) {
                const totalEnergy = this.storedEnergy + waterMassCapacity;
                this.temperature = totalEnergy / waterMassCapacity;
            } else {
                this.temperature = this.storedEnergy / waterMassCapacity;
            }
        } else {
            this.temperature = this.ambientTemperature;
        }
    }

    public getTemperature(): number {
        return this.temperature;
    }

    public getWaterMass(): number {
        return this.waterMass;
    }

    public getTemperatureInFahrenheit(): number {
        return this.temperature * 9 / 5 + 32;
    }
}

//////////////////////////////////////////////////////////////////////
////////////////////////    SIMULATION   /////////////////////////////
//////////////////////////////////////////////////////////////////////

class Simulation {
    private solarIrradiance: number;
    private solarPanel: SolarPanel;
    private pump: Pump;
    private storageTank: StorageTank;
    private periods: number;
    private resultsElement: HTMLElement;

    constructor(solarIrradiance: number, solarPanel: SolarPanel, pump: Pump, storageTank: StorageTank, periods: number, resultsElementId: string) {
        this.solarIrradiance = solarIrradiance;
        this.solarPanel = solarPanel;
        this.pump = pump;
        this.storageTank = storageTank;
        this.periods = periods;
        const element = document.getElementById(resultsElementId);
        if (!element) {
            throw new Error(`Element with id ${resultsElementId} not found`);
        }
        this.resultsElement = element;
    }

    private addResult(content: string): void {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'simulation-result';
        resultDiv.innerHTML = content;
        this.resultsElement.appendChild(resultDiv);
    }

    public async run(zipCode: string, apiKey: string): Promise<void> {
        try {
            this.resultsElement.innerHTML = ''; // Clear previous results

            // Fetch weather data
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?zip=${zipCode},us&appid=${apiKey}&units=metric`);
            const forecast = response.data;

            for (let i = 0; i < this.periods; i++) {
                const time = new Date(forecast.list[i].dt * 1000).toString();
                const clouds = forecast.list[i].clouds.all;
                const temperature = forecast.list[i].main.temp;
                const timeOfDay = (new Date(forecast.list[i].dt * 1000)).getHours();

                // Report conditions
                const periodConditions = `<strong>Period ${i + 1}: ${time} | Clouds: ${clouds} | Temperature: ${temperature}°C</strong>`;
                this.addResult(`<strong>${periodConditions}</strong>`);

                // Calculate solar irradiance based on cloud cover
                const reductionFactor = 1 - (clouds / 100);
                const adjustedSolarIrradiance = this.solarIrradiance * reductionFactor;
                const solarIrradianceDisplay = ` Solar Irradiance: ${adjustedSolarIrradiance} W/m²`;
                this.addResult(solarIrradianceDisplay);

                // Solar panel absorbs energy
                this.solarPanel.absorbEnergy(adjustedSolarIrradiance, temperature, timeOfDay);

                // Pump transfers energy to storage tank
                const { energy, waterTemperature } = this.solarPanel.transferEnergy();
                this.pump.transferEnergy(energy, waterTemperature, this.storageTank);

                // Apply storage tank heat losses
                this.storageTank.applyHeatLoss();

                // Set the incoming water temperature for the next cycle
                this.solarPanel.setIncomingWaterTemperature(this.storageTank.getTemperature());

                // Output Results
                const storedEnergy = ` Stored Energy: ${this.storageTank.getStoredEnergy()} J`;
                const temperatureF = `(${this.storageTank.getTemperatureInFahrenheit()} °F)`;
                const waterMass = ` Water Mass: ${this.storageTank.getWaterMass()} kg`;
                const temperatureC = ` -> Tank Temperature: ${this.storageTank.getTemperature()} °C`;

                this.addResult(storedEnergy);
                this.addResult(waterMass);
                this.addResult(`${temperatureC} ${temperatureF}`);
                this.addResult('<br>');
            }
        } catch (error) {
            console.error("Error fetching weather data: ", error);
            this.addResult("Error fetching weather data.");
        }
    }
}

//////////////////////////////////////////////////////////////////////
////////////////////////     RUNTIME     /////////////////////////////
//////////////////////////////////////////////////////////////////////

async function runSimulation() {
    // Read input values
    const zipCode = (document.getElementById('zipCode') as HTMLInputElement).value;
    const solarIrradiance = parseFloat((document.getElementById('solarIrradiance') as HTMLInputElement).value);
    const solarPanelEfficiency = parseFloat((document.getElementById('solarPanelEfficiency') as HTMLInputElement).value);
    const solarPanelEnergy = parseFloat((document.getElementById('solarPanelEnergy') as HTMLInputElement).value);
    const solarPanelLossFactor = parseFloat((document.getElementById('solarPanelLossFactor') as HTMLInputElement).value);
    const solarPanelCoefficient = parseFloat((document.getElementById('solarPanelCoefficient') as HTMLInputElement).value);
    const solarPanelArea = parseFloat((document.getElementById('solarPanelArea') as HTMLInputElement).value);
    const pumpEfficiency = parseFloat((document.getElementById('pumpEfficiency') as HTMLInputElement).value);
    const storageTankStoredEnergy = parseFloat((document.getElementById('storageTankStoredEnergy') as HTMLInputElement).value);
    const storageTankTemperature = parseFloat((document.getElementById('storageTankTemperature') as HTMLInputElement).value);
    const storageTankHeatLossRate = parseFloat((document.getElementById('storageTankHeatLossRate') as HTMLInputElement).value);
    const storageTankWaterMass = parseFloat((document.getElementById('storageTankWaterMass') as HTMLInputElement).value);
    const storageTankAmbientTemperature = parseFloat((document.getElementById('storageTankAmbientTemperature') as HTMLInputElement).value);

    // Initialize components with the input values
    const solarPanel = new SolarPanel(solarPanelEfficiency, solarPanelLossFactor, solarPanelEnergy, solarPanelCoefficient, storageTankTemperature, solarPanelArea);
    const pump = new Pump(pumpEfficiency);
    const storageTank = new StorageTank(storageTankHeatLossRate, storageTankWaterMass, storageTankTemperature, storageTankAmbientTemperature, storageTankStoredEnergy);
    const simulationPeriods = SIM_TOTAL_HOURS / WEATHER_HOUR_RATE;

    // Create and run simulation
    const openWeatherMapApiKey = '52fbeafbac693adcdacdf9056189e190';
    const simulation = new Simulation(solarIrradiance, solarPanel, pump, storageTank, simulationPeriods, 'simulation-results');
    await simulation.run(zipCode, openWeatherMapApiKey);
}

// Expose the simulation to the global scope
(window as any).runSimulation = runSimulation;

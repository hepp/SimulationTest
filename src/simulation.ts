import axios from 'axios';

//////////////////////////////////////////////////////////////////////
////////////////////////     CLASSES     /////////////////////////////
//////////////////////////////////////////////////////////////////////

// Assuming specific heat capacity of water is 4.186 J/g°C -> https://brainly.com/question/6363778
const SPECIFIC_HEAT_CAPACITY = 4.186;


class SolarPanel {
    private efficiency: number;
    private energy: number;
    private lossFactor: number;

    constructor(efficiency: number, lossFactor: number, energy: number) {
        this.efficiency = efficiency;
        this.energy = energy;
        this.lossFactor = lossFactor;
    }

    public absorbEnergy(solarIntensity: number): void {
        this.energy += solarIntensity * this.efficiency;
        this.energy -= this.energy * this.lossFactor; // Energy loss
    }

    public transferEnergy(): number {
        const energyToTransfer = this.energy;
        this.energy = 0; // Reset energy after transfer
        return energyToTransfer;
    }
}

class Pump {
    private efficiency: number;

    constructor(efficiency: number) {
        this.efficiency = efficiency;
    }

    public transferEnergy(energy: number, storageTank: StorageTank): void {
        const transferredEnergy = energy * this.efficiency;
        storageTank.storeEnergy(transferredEnergy);
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

    public storeEnergy(energy: number): void {
        this.storedEnergy += energy;
        this.updateTemperature();
    }

    public getStoredEnergy(): number {
        return this.storedEnergy;
    }

    public applyHeatLoss(): void {
        const heatLoss = this.heatLossRate * (this.temperature - this.ambientTemperature);
        this.storedEnergy -= heatLoss;
        this.updateTemperature();
    }

    private updateTemperature(): void {
        this.temperature = this.storedEnergy / (this.waterMass * SPECIFIC_HEAT_CAPACITY);
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
    private solarIntensity: number;
    private solarPanel: SolarPanel;
    private pump: Pump;
    private storageTank: StorageTank;
    private periods: number;
    private resultsElement: HTMLElement;

    constructor(solarIntensity: number, solarPanel: SolarPanel, pump: Pump, storageTank: StorageTank, periods: number, resultsElementId: string) {
        this.solarIntensity = solarIntensity;
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
                const periodNumber = `<strong>Period ${i + 1}: ${time} | Clouds: ${clouds} </strong>`;
                this.addResult(`<strong>${periodNumber}</strong>`);

                const reductionFactor = 1 - (clouds / 100);
                const solarResult = this.solarIntensity * reductionFactor;

                const solarIntensityDisplay = ` Solar Input [Intensity: ${this.solarIntensity}]: ${solarResult} units`;
                this.addResult(solarIntensityDisplay);

                // Solar panel absorbs energy
                this.solarPanel.absorbEnergy(solarResult);

                // Pump transfers energy to storage tank
                const energy = this.solarPanel.transferEnergy();
                this.pump.transferEnergy(energy, this.storageTank);

                // Apply storage tank heat losses
                this.storageTank.applyHeatLoss();

                // Output Results
                const storedEnergy = ` Stored Energy: ${this.storageTank.getStoredEnergy()} units`;
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
    const solarIntensity = parseFloat((document.getElementById('solarIntensity') as HTMLInputElement).value);
    const solarPanelEfficiency = parseFloat((document.getElementById('solarPanelEfficiency') as HTMLInputElement).value);
    const solarPanelEnergy = parseFloat((document.getElementById('solarPanelEnergy') as HTMLInputElement).value);
    const solarPanelLossFactor = parseFloat((document.getElementById('solarPanelLossFactor') as HTMLInputElement).value);
    const pumpEfficiency = parseFloat((document.getElementById('pumpEfficiency') as HTMLInputElement).value);
    const storageTankStoredEnergy = parseFloat((document.getElementById('storageTankStoredEnergy') as HTMLInputElement).value);
    const storageTankTemperature = parseFloat((document.getElementById('storageTankTemperature') as HTMLInputElement).value);
    const storageTankHeatLossRate = parseFloat((document.getElementById('storageTankHeatLossRate') as HTMLInputElement).value);
    const storageTankWaterMass = parseFloat((document.getElementById('storageTankWaterMass') as HTMLInputElement).value);
    const storageTankAmbientTemperature = parseFloat((document.getElementById('storageTankAmbientTemperature') as HTMLInputElement).value);

    // Initialize components with the input values
    const solarPanel = new SolarPanel(solarPanelEfficiency, solarPanelLossFactor, solarPanelEnergy);
    const pump = new Pump(pumpEfficiency);
    const storageTank = new StorageTank(storageTankHeatLossRate, storageTankWaterMass, storageTankTemperature, storageTankAmbientTemperature, storageTankStoredEnergy);
    const simulationPeriods = 8; // 8 periods * 3 hours = 24 hours

    // Create and run simulation
    const openWeatherMapApiKey = '52fbeafbac693adcdacdf9056189e190';
    const simulation = new Simulation(solarIntensity, solarPanel, pump, storageTank, simulationPeriods, 'simulation-results');
    await simulation.run(zipCode, openWeatherMapApiKey);
}

// Expose the simulation to the global scope
(window as any).runSimulation = runSimulation;
// Assuming specific heat capacity of water is 4.186 J/g°C -> https://brainly.com/question/6363778
const SPECIFIC_HEAT_CAPACITY = 4.186;

class Environment {
    private solarIntensity: number;

    constructor(solarIntensity: number) {
        this.solarIntensity = solarIntensity;
    }

    public getSolarEnergy(): number {
        return this.solarIntensity;
    }

    public updateSolarIntensity(newIntensity: number): void {
        this.solarIntensity = newIntensity;
    }
}

class SolarPanel {
    private efficiency: number;
    private energy: number;
    private lossFactor: number;

    constructor(efficiency: number, lossFactor: number, energy: number) {
        this.efficiency = efficiency;
        this.energy = energy;
        this.lossFactor = lossFactor;
    }

    public absorbEnergy(environment: Environment): void {
        this.energy += environment.getSolarEnergy() * this.efficiency;
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

    public getTemperatureInFahrenheit(): number {
        return this.temperature * 9 / 5 + 32;
    }

    public getWaterMassInGallons(): number {
        return this.waterMass * 0.264172;
    }
}

class Simulation {
    private environment: Environment;
    private solarPanel: SolarPanel;
    private pump: Pump;
    private storageTank: StorageTank;
    private periods: number;
    private resultsElement: HTMLElement;

    constructor(environment: Environment, solarPanel: SolarPanel, pump: Pump, storageTank: StorageTank, periods: number, resultsElementId: string) {
        this.environment = environment;
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

    private simulateSunActivity(): void {
        // Simulate daily solar intensity changes: TODO - pull in realtime weather data
        const baseIntensity = 100;
        const variability = 20;

        const newIntensity = baseIntensity + (Math.random() - 0.5) * 2 * variability;
        this.environment.updateSolarIntensity(newIntensity);
    }

    private addResult(content: string): void {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'simulation-result';
        resultDiv.innerHTML = content;
        this.resultsElement.appendChild(resultDiv);
    }

    public run(): void {
        this.resultsElement.innerHTML = ''; // Clear previous results
        for (let i = 0; i < this.periods; i++) {
            const periodNumber = `Period ${i + 1}:`;
            this.addResult(`<strong>${periodNumber}</strong>`);

            // Update solar intensity
            this.simulateSunActivity();
            const solarIntensity = `Solar Intensity: ${this.environment.getSolarEnergy()} units`;
            this.addResult(solarIntensity);

            // Solar panel absorbs energy
            this.solarPanel.absorbEnergy(this.environment);

            // Pump transfers energy to storage tank
            const energy = this.solarPanel.transferEnergy();
            this.pump.transferEnergy(energy, this.storageTank);

            // Apply storage tank heat losses
            this.storageTank.applyHeatLoss();

            const storedEnergy = `Stored Energy: ${this.storageTank.getStoredEnergy()} units`;
            const temperatureC = `Tank Temperature: ${this.storageTank.getTemperature()} °C`;
            const temperatureF = `(${this.storageTank.getTemperatureInFahrenheit()} °F)`;
            const waterMass = `Water Mass: ${this.storageTank.getWaterMassInGallons()} gallons`;

            this.addResult(storedEnergy);
            this.addResult(waterMass);
            this.addResult(`${temperatureC} ${temperatureF}`);
            this.addResult('<br>'); // Add a line break for better readability
        }
    }
}

// Function to read input values and run the simulation
function runSimulation() {
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
    const environment = new Environment(solarIntensity);
    const solarPanel = new SolarPanel(solarPanelEfficiency, solarPanelLossFactor, solarPanelEnergy);
    const pump = new Pump(pumpEfficiency);
    const storageTank = new StorageTank(storageTankHeatLossRate, storageTankWaterMass, storageTankTemperature, storageTankAmbientTemperature, storageTankStoredEnergy);
    const simulationPeriods = 10; // Fixed number of periods for now

    // Create and run simulation
    const simulation = new Simulation(environment, solarPanel, pump, storageTank, simulationPeriods, 'simulation-results');
    simulation.run();
}


// Expose the function to the global scope
(window as any).runSimulation = runSimulation;

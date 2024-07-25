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

    constructor(efficiency: number, lossFactor: number) {
        this.efficiency = efficiency;
        this.energy = 0;
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

    constructor(heatLossRate: number, waterMass: number, initialTemperature: number, ambientTemperature: number) {
        this.storedEnergy = 0;
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

    constructor(environment: Environment, solarPanel: SolarPanel, pump: Pump, storageTank: StorageTank, periods: number) {
        this.environment = environment;
        this.solarPanel = solarPanel;
        this.pump = pump;
        this.storageTank = storageTank;
        this.periods = periods;
    }

    private simulateSunActivity(): void {
        // Simulate daily solar intensity changes
        const baseIntensity = 100;
        const variability = 20;
        const newIntensity = baseIntensity + (Math.random() - 0.5) * 2 * variability;
        this.environment.updateSolarIntensity(newIntensity);
    }

    public run(): void {
        for (let i = 0; i < this.periods; i++) {
            console.log(`Period ${i + 1}:`);

            // Update solar intensity
            this.simulateSunActivity();
            console.log(`Solar Intensity: ${this.environment.getSolarEnergy()} units`);

            // Solar panel absorbs energy
            this.solarPanel.absorbEnergy(this.environment);

            // Pump transfers energy to storage tank
            const energy = this.solarPanel.transferEnergy();
            this.pump.transferEnergy(energy, this.storageTank);

            // Apply storage tank heat losses
            this.storageTank.applyHeatLoss();

            console.log(`Stored Energy: ${this.storageTank.getStoredEnergy()} units`);
            console.log(`Tank Temperature: ${this.storageTank.getTemperature()} °C (${this.storageTank.getTemperatureInFahrenheit()} °F)`);
            console.log(`Water Mass: ${this.storageTank.getWaterMassInGallons()} gallons\n`);
        }
    }
}


// Assuming specific heat capacity of water is 4.186 J/g°C -> https://brainly.com/question/6363778
const SPECIFIC_HEAT_CAPACITY = 4.186;

// Initialize components
const environment = new Environment(100); // Initial solar intensity
const solarPanel = new SolarPanel(0.2, 0.05); // 20% efficiency, 5% loss factor
const pump = new Pump(0.9); // 90% efficiency
const storageTank = new StorageTank(0.01, 100, 25, 20); // 1% heat loss rate, 100 kg water mass, initial temperature 25°C, ambient temperature 20°C
const simulationPeriods = 20;

// Create and run simulation
const simulation = new Simulation(environment, solarPanel, pump, storageTank, simulationPeriods);
simulation.run();

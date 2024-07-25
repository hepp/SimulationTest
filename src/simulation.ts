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
    private lossFactor: number;

    constructor(lossFactor: number) {
        this.storedEnergy = 0;
        this.lossFactor = lossFactor;
    }

    public storeEnergy(energy: number): void {
        this.storedEnergy += energy;
    }

    public getStoredEnergy(): number {
        return this.storedEnergy;
    }

    public applyLosses(): void {
        this.storedEnergy -= this.storedEnergy * this.lossFactor;
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
            // Update solar intensity
            this.simulateSunActivity();

            // Solar panel absorbs energy
            this.solarPanel.absorbEnergy(this.environment);

            // Pump transfers energy to storage tank
            const energy = this.solarPanel.transferEnergy();
            this.pump.transferEnergy(energy, this.storageTank);

            // Apply storage tank losses
            this.storageTank.applyLosses();
        }
    }
}

const environment = new Environment(100); // Initial solar intensity
const solarPanel = new SolarPanel(0.2, 0.05); // 20% efficiency, 5% loss factor
const pump = new Pump(0.9); // 90% efficiency
const storageTank = new StorageTank(0.01); // 1% loss factor
const simulationPeriods = 10;

// Create and run simulation
const simulation = new Simulation(environment, solarPanel, pump, storageTank, simulationPeriods);
simulation.run();

import { describe, expect, it } from "vitest";
import { DiodeModel } from "./DiodeModel";

describe("built-in mobile diode models", () => {
    it("uses near-zero forward voltage and negligible reverse leakage for the idealized model", () => {
        DiodeModel.createModelMap();
        const model = DiodeModel.getModelWithName("ideal");
        const forwardVoltageAt1A = model.vscale * Math.log(1 / model.saturationCurrent + 1);

        expect(forwardVoltageAt1A).toBeLessThan(0.002);
        expect(model.saturationCurrent).toBeLessThan(1e-17);
    });

    it("sets silicon and germanium barriers near 0.7V and 0.3V at 1mA", () => {
        DiodeModel.createModelMap();
        const silicon = DiodeModel.getModelWithName("Si diode");
        const germanium = DiodeModel.getModelWithName("Ge diode");
        const forwardVoltageAt1mA = (model: DiodeModel) =>
            model.vscale * Math.log(1e-3 / model.saturationCurrent + 1);

        expect(forwardVoltageAt1mA(silicon)).toBeCloseTo(0.7, 2);
        expect(forwardVoltageAt1mA(germanium)).toBeCloseTo(0.3, 2);
    });
});

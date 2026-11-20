import { DiodeElm } from "./DiodeElm";
import { StringTokenizer } from "./StringTokenizer";

export class SiDiodeElm extends DiodeElm {
    constructor(x: number, y: number);
    constructor(xa: number, ya: number, xb: number, yb: number, flags: number, st: StringTokenizer);
    constructor(xa: number, ya: number, xb?: number, yb?: number, flags?: number, st?: StringTokenizer) {
        if (xb === undefined) {
            super(xa, ya);
            this.modelName = "Si diode";
            this.setup();
        } else {
            super(xa, ya, xb, yb!, flags!, st!);
        }
    }

    getDumpClass(): Function { return DiodeElm; }
    getShortcut(): number { return 0; }
}

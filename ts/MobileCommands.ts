export interface MobileCommand {
    menu: string;
    item: string;
}

const commands: Readonly<Record<string, MobileCommand>> = Object.freeze({
    undo: { menu: "edit", item: "undo" },
    redo: { menu: "edit", item: "redo" },
    select: { menu: "main", item: "Select" },
    drag: { menu: "main", item: "DragAll" },
    wire: { menu: "main", item: "WireElm" },
    resistor: { menu: "main", item: "ResistorElm" },
    ground: { menu: "main", item: "GroundElm" },
    capacitor: { menu: "main", item: "CapacitorElm" },
    inductor: { menu: "main", item: "InductorElm" },
    diode: { menu: "main", item: "DiodeElm" },
    voltageSource: { menu: "main", item: "DCVoltageElm" },
    switch: { menu: "main", item: "SwitchElm" },
    zoomIn: { menu: "zoom", item: "zoomin" },
    zoomOut: { menu: "zoom", item: "zoomout" },
    zoom100: { menu: "zoom", item: "zoom100" },
    commandPalette: { menu: "key", item: "commandpalette" },
    copy: { menu: "edit", item: "copy" },
    paste: { menu: "edit", item: "paste" },
});

export function getMobileCommand(actionId: string): MobileCommand | null {
    return Object.prototype.hasOwnProperty.call(commands, actionId)
        ? commands[actionId]
        : null;
}

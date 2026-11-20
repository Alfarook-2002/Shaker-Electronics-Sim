import { describe, expect, it } from "vitest";
import { getMobileCommand } from "./MobileCommands";

describe("mobile command allowlist", () => {
    it("resolves supported actions to fixed commands", () => {
        expect(getMobileCommand("wire")).toEqual({ menu: "main", item: "WireElm" });
        expect(getMobileCommand("drag")).toEqual({ menu: "main", item: "DragAll" });
    });

    it("rejects unknown action IDs", () => {
        expect(getMobileCommand("deleteAll")).toBeNull();
        expect(getMobileCommand("main:Delete")).toBeNull();
        expect(getMobileCommand("runStop")).toBeNull();
    });
});

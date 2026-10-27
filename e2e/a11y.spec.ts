import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Auditoría axe sobre las superficies públicas principales.
 * Solo bloquean las violaciones `critical` y `serious`; el resto se lista
 * como información en el reporter.
 */
const PAGES = [
  { path: "/", name: "portada" },
  { path: "/plataforma", name: "plataforma" },
  { path: "/precios", name: "precios" },
  { path: "/contacto", name: "contacto" },
  { path: "/login", name: "login" },
  { path: "/demo", name: "chat" },
];

for (const target of PAGES) {
  test(`${target.name}: sin violaciones críticas de accesibilidad`, async ({ page }) => {
    await page.goto(target.path, { waitUntil: "load" });
    await page.locator("main").waitFor();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(
      blocking.map((violation) => `${violation.id} (${violation.nodes.length} nodos)`),
    ).toEqual([]);
  });
}

test("el idioma inglés se renderiza en servidor con lang correcto", async ({ page, context }) => {
  await page.goto("/plataforma");
  await context.addCookies([
    { name: "vigo-locale", value: "en", url: new URL(page.url()).origin },
  ]);
  await page.reload({ waitUntil: "load" });

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Platform");
});

import { mutate, newProduct } from "./workspace";

export async function seedDemo(userId: string) {
  await mutate(userId, (ws) => {
    if (ws.products.length) return;
    const p = newProduct(
      {
        name: "FlowDesk",
        tagline: "Recurring work, on autopilot.",
        website: "https://flowdesk.example",
        category: "Productivity SaaS",
        description:
          "FlowDesk is a lightweight workflow tool for small teams. Set up a recurring workflow once — onboarding, weekly reports, month-end close — and FlowDesk assigns the steps, nudges owners and shows what's stuck.",
        audience: "Startup founders and operations leads at 5–50 person teams",
        features: ["Recurring workflow templates", "Auto-assign steps to owners", "Slack nudges for overdue steps", "One dashboard for everything that's stuck"],
        voice: "Friendly, practical, no buzzwords. Short sentences.",
        brand: { primary: "#5B3DF5", accent: "#22D3EE", background: "#0E0A24", text: "#FFFFFF" },
      },
      "you"
    );
    ws.products.push(p);
    ws.activity.unshift({ at: new Date().toISOString(), actor: "you", summary: "Added sample product FlowDesk", link: `/products/${p.id}` });
  });
}

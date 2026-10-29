Role & Context
You are an expert UI/UX designer and frontend developer specializing in modern health-tech and wellness platforms. Your task is to design and build a fully responsive, premium-looking Health Dashboard Web UI based on a specific dark-light contrast aesthetic.

Visual & Design Direction

Aesthetic: Modern, sleek, and slightly playful (neon/cyber health vibe). It features a dark sidebar contrasted with a soft, light-gray main content area.

Color Palette:

Sidebar: Deep charcoal/black (#1a1a1c or similar).

Main Background: Off-white/light gray (#f2f2f2 or #f5f5f7).

Accent Colors: Lime green (#d4ff2b), Soft Purple (#b39ddb / #a78bfa), Dark Black/Charcoal, and White.

Card Design: Neatly rounded corners (border-radius: 24px), clean white backgrounds for most cards, and one standout dark card for Sleep Analysis. Subtle shadows.

Typography: Use a modern, clean geometric sans-serif font like Inter or Plus Jakarta Sans. Use bold weights for main metrics and lighter weights for labels.

Layout Structure
The layout is a fixed sidebar on the left and a scrollable main content area on the right.

1. Left Sidebar (Dark Theme)

Logo: Top left, white text with a simple leaf/plant icon, text "flux".

Navigation Menu: Pill-shaped active state for the current page (Dashboard) using the lime green accent color with black text. Inactive links (Home, Nutrition, Reports, Users, Messages) should be in muted gray/white with icons. Include small notification badges (yellow/green) where appropriate.

Bottom CTA: A prominent card with a lime green background, an illustration (like a rocket or 3D shapes), text "Upgrade to Pro", and a dark pill-shaped "Upgrade Now" button.

2. Top Header (Main Content)

User Profile: Top left, avatar image with name "Lucas Bennett", email "bennett02@gmail.com", and a dropdown chevron.

Search & Actions: Top right, a rounded search bar with a magnifying glass icon, and a notification bell icon with a green badge.

Page Title: Large, bold text "Health Overview" with a subtitle "Take control of your health today!".

Date Filter: Right side, text "12 July, 2024" with a pill-shaped "Today" dropdown button.

3. Dashboard Grid (Main Content Cards)
Create a responsive CSS Grid layout to hold the following cards:

Card 1: Energy Used (Large vertical card, left side)

Header: Lightning bolt icon, "Energy Used", and a three-dot menu.

Main Metric: "4,3k" kcal today, with a small lime-green "+5%" badge.

Visualization: A cluster of three intersecting circles (Venn diagram style). Large soft-purple circle ("2,6k kcal"), large dark-charcoal circle ("1,2k kcal"), and a smaller lime-green circle ("500 kcal").

Below: Progress bars for "Running" (45%, purple), "Workouts" (30%, black), and "Walking" (25%, lime green).

Card 2: Heart Rate (Top middle)

Header: Heart icon, "Heart Rate", three-dot menu.

Metric: "62 bpm" (large bold), with "Avg 78 bpm" aligned to the right in smaller text.

Card 3: Activity (Bottom middle)

Header: Runner icon, "Activity", three-dot menu.

Metric: "5,8 km" (large bold), with "Active 75 Min" aligned to the right.

Card 4: Wellness Index (Top right)

Header: Percentage icon, "Wellness Index", three-dot menu.

Metric: "78%" (large bold) with a lime-green "+10%" badge.

Visualization: A dot-matrix/heatmap chart made of small purple circles with varying opacities.

Card 5: Sleep Analysis (Large horizontal card, bottom right)

Background: Dark charcoal/black card with white text.

Header: Moon icon, "Sleep Analysis", and a "Monthly" dropdown pill on the right.

Metrics: "85% Sleep Efficiency" (with a lime green accent line) and "7h 15m Sleep Duration" (with a purple accent line).

Visualization: A bar chart for months (Jun to Dec). Most bars are dark gray with a subtle diagonal line pattern. The 'Sept' bar is highlighted with a tall lime-green bar and a slightly shorter purple bar next to it. Include a small arrow pointing up at 'Sept'.

Technical Requirements

Write clean, semantic HTML5 and CSS3.

Use CSS Grid and Flexbox for layout.

Make it fully responsive (stack cards on smaller screens).

Use Font Awesome (or similar) for icons.

No external CSS frameworks (Tailwind/Bootstrap) unless specifically requested; write custom CSS to match the exact design style.

Provide realistic placeholder data and use CSS for the charts (circles, dot matrix, bar charts) instead of heavy JavaScript libraries.

Deliverable
Provide the complete, single-file HTML/CSS code that perfectly replicates the visual hierarchy, color scheme, and layout of the provided dashboard design.
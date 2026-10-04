# Future: Xcode / Simulator capture

Planned module for automating genuine screenshot capture:

1. Launch iOS Simulator
2. Build and install the app
3. Run XCUITest flows to navigate defined states
4. Capture screenshots into `apps/<app>/screenshots/raw/`
5. Invoke Cody1StoreKit generate/validate

Screenshot capture stays separate from rendering. Do not couple XCUITest into the renderer.

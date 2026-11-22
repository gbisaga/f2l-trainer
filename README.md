# F2L Trainer

Setting up F2L cases by hand slows down practice. When you repeat the same setups, you start to recognize the setup sequence before you’ve had a chance to read the case. And choosing an algorithm on a screen skips the physical turns that build muscle memory.

This trainer generates the F2L case on screen and uses a Bluetooth smart cube as the controller. Look at the virtual cube to recognize the case, then execute the solution by turning the cube in your hands. The virtual cube responds in real time and tells you when the pair is solved. The physical cube can start in any state, so you can go straight into the next case.

![F2L Trainer showing the virtual cube and practice controls](docs/trainer.png)

Open the [hosted F2L Trainer](https://gbisaga.github.io/f2l-trainer/) in desktop Chrome or Edge to connect your smart cube.

## Cube compatibility

The GAN i4 is the only model tested so far. Other Bluetooth 3×3 smart cubes supported by [smartcube-web-bluetooth](https://github.com/poliva/smartcube-web-bluetooth) may work for turn input. Gyro-controlled viewing requires orientation data, and the gyro axis mapping may vary by model.

## Run locally

Use Node.js 22.12 or newer. Dependencies are already installed in this workspace. For a fresh checkout, run `npm ci` first.

```sh
npm run dev
```

Open the localhost URL printed by Vite in desktop Chrome or Edge. Turn on Bluetooth, wake your smart cube with a face turn, and disconnect it from any other cube app. Click **Connect Cube** and select it in the browser picker.

If the connection reports that it cannot determine or verify the cube MAC address, enter the cube's Bluetooth MAC in the optional field and try again. Use six colon-separated hex pairs, such as `AA:BB:CC:DD:EE:FF`.

On Windows, open `chrome://bluetooth-internals/#devices` in Chrome or
`edge://bluetooth-internals/#devices` in Edge. Start a scan, wake the cube,
and copy the **Address** for your cube. Stop the scan, paste the address into
the trainer, and reconnect. The library remembers a verified address for that
device on the same browser and site origin.

## Practice F2L

1. Connect your smart cube, then open **Select F2L Cases** to choose any subset of the 41 cases, grouped by SpeedCubeDB category. All cases are enabled on first use and selections are saved in the browser.
2. Choose one of the four positions under **Next slot**, then select **New Case**. The trainer picks from your selected cases and avoids repeating the previous one when possible. It can start the top layer at a different angle each time. **Retry Case** keeps the same slot and starting position.
3. Solve the target pair with physical face turns. The trainer checks the target corner and edge, the cross, and the other three slots. The last layer may remain scrambled. Recognition, execution, and total times appear when the attempt is solved. Face turns animate at a relaxed pace. During a burst, the display can skip animations to catch up while every turn still counts.
4. Choose **Learn** to pick from the first four SpeedCubeDB solutions in their listed order, or **Test** to practice recognition. In Test, **Hint** shows the first solution for five seconds. Make the listed turns on your cube from the position shown when you click **New Case** or **Retry Case**. The steps already include any top-layer turn needed to line up the pair. **Retry Case** restores that position and restarts timing.
5. **Reset Gyro** adjusts the view during practice. **Reset Virtual Cube** leaves the exercise and returns to free turning on a solved cube.

Read the solution using the cube’s calibrated grip. In that grip, `U` means turn the top, `R` means turn the right face, and `F` means turn the front. The **Face IDs reported by your cube** line helps you compare the solution with the Bluetooth readout if your cube labels those faces differently.

Open **On-screen cube colors** beside the cube to choose its top and front center colors. The other colors follow the same color scheme, and you can keep holding your physical cube with yellow up and green facing you. With a different on-screen top color, the practice cross uses the opposite color.

The [SpeedCubeDB F2L library](https://www.speedcubedb.com/a/3x3/F2L) defines the case numbering and source setups. Cases 8 and 13 use outer-turn setups with matching target-piece configurations. Timings use the first rendered frame and the browser's receipt of face-turn events.

## Face calibration

For the default grip, connect with your cube’s **yellow center on top** and **green center facing you**. To calibrate a different grip, choose which center you want on top and which you want facing you. Turn each of those faces once to see the ID your cube reports under **Last physical face turn**. Select those IDs in the calibration controls, hold the cube in the chosen grip, and select **Reset Gyro** once gyro readings arrive.

Calibration maps all six physical faces to virtual faces. When you rotate the whole cube, each physical face still turns its mapped virtual face as it moves around the screen. Reset Gyro preserves the scramble and timers. Reset Virtual Cube preserves the mapping and view. The Bluetooth adapter keeps facelet events as log markers and discards the sticker payload.

## Test with your cube

1. Hold your cube with its yellow center on top and its green center facing you. Connect and check that the virtual cube starts solved in the same orientation, even if your cube is scrambled. The first valid gyro sample becomes the reference.
2. Turn the face on your right clockwise as viewed from that face. Check that the virtual right layer responds and the move readout shows `R`. Reset the virtual cube, then use the right and top faces to do `R U R' U'` and compare the virtual result.
3. Rotate the whole cube about each axis. Check that the view follows in the same direction and the move count stays fixed.
4. Rotate your cube 90 degrees, then turn the same face you turned in step 2. The virtual right layer should turn in its new screen position and the physical event log should report the same face ID as before.
5. With the virtual puzzle scrambled, calibrate a different grip using **Reset Gyro**. The virtual cube returns to the yellow-up, green-front view with its scramble intact. Turning the physical face you chose as the top should now apply virtual `U`.
6. Rotate away from the home view and select **Reset Virtual Cube**. The puzzle becomes solved in its current viewing orientation. Make another face turn and confirm it applies from solved.
7. Repeat a quick sequence slowly after resetting. Compare the turn count and final virtual state. The log shows the latest 20 events, including gyro readings.
8. Disconnect and reconnect. The virtual puzzle persists, and the first gyro sample sets a fresh orientation reference.

The renderer requires WebGL 2.

Run `npm run build` to type-check and build the app.

Run `npm test` to check the 41 F2L cases at all four U alignments, retry timing, and face mapping for all 24 grip calibrations.

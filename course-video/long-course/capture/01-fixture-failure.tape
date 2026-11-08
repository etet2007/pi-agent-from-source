Output assets/terminal/01-fixture-failure-vhs.mp4

Require node

Set Shell "zsh"
Set FontSize 23
Set FontFamily "Menlo"
Set LetterSpacing 0.1
Set LineHeight 1.05
Set Width 1440
Set Height 900
Set Padding 30
Set Margin 24
Set MarginFill "#0B0E14"
Set BorderRadius 12
Set WindowBar Colorful
Set WindowBarSize 36
Set Theme "GitHub Dark"
Set Framerate 30
Set TypingSpeed 24ms

Hide
Type "rm -rf /tmp/pi-agent-demo && cp -R ../../archive/pi-agent-study/pi-agent-video-fixture /tmp/pi-agent-demo && cd /tmp/pi-agent-demo && clear"
Enter
Sleep 500ms
Show

Type "pwd"
Enter
Sleep 800ms

Type "sed -n '1,12p' discount.test.js"
Enter
Sleep 2s

Type "echo 'Expected: 200 x (1 - 15%) = 170'"
Enter
Sleep 1.5s

Type "npm test --silent"
Enter
Sleep 6s

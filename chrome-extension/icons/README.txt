Vero Test Recorder - Icon Requirements
======================================

The Chrome extension requires PNG icons in the following sizes:
- icon16.png  (16x16 pixels)  - Used in the browser toolbar
- icon48.png  (48x48 pixels)  - Used in the extensions page
- icon128.png (128x128 pixels) - Used in the Chrome Web Store

How to Generate Icons
---------------------

Option 1: Using the SVG source
The icon.svg file in this directory can be converted to PNG using:
- Online tools like CloudConvert or Convertio
- Command line tools like ImageMagick:
    convert -density 300 -resize 16x16 icon.svg icon16.png
    convert -density 300 -resize 48x48 icon.svg icon48.png
    convert -density 300 -resize 128x128 icon.svg icon128.png

Option 2: Using a design tool
Create new icons in Figma, Sketch, or Adobe Illustrator and export as PNG.

Icon Design Guidelines
----------------------
- Use a simple, recognizable design
- Ensure visibility at small sizes (16x16)
- Use the Vero brand colors: #4f46e5 (indigo) as primary
- Include visual indication of recording capability
- Avoid text at smaller sizes (16px, 48px)

Current Brand Colors
--------------------
Primary:    #4f46e5 (Indigo)
Secondary:  #7c3aed (Purple)
Danger:     #ef4444 (Red - for recording indicator)
Success:    #22c55e (Green)

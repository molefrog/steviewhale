# StevieWhale
### What is StevieWhale?

![](https://rawgithub.com/molefrog/steviewhale/master/app/assets/images/stevie-kid.svg)

StevieWhale - is a web-application the main feature of which is to print tagged photos from Instagram in real-time. The application looks for a photos tagged with special tag and then prints it using one of the connected print stations. The Print Station - is a printer connected through **socket.io** to the main server. Print Station basically holds connection and waits for the print job to arrive.

The most interesting part - you don't know exactly on which print station the photo is going to be printed. The motivation of this project is to make people happy by bringing them the experience of real printed photos.  

### Directory Structure
 1. `app/` Client-side logic (front-end): scripts, assets, styles, templates etc. The content of this folder is used by Brunch to build `public/` directory.
 2. `server/` Server-side logic (back-end).
 3. `public/` The folder contains built static files. The files inside this folder are generated automaticaly!


### Building Process
First of all, make sure you have `node.js` installed.
 * Install development tools:
```
npm install -g coffee-script bower brunch
```
 * Install both `npm` and `bower` (server and client side package managers respectively) dependencies:
```
npm install && bower install
```
 * Build client-side script and assets (using [Brunch](brunch.io) assembler):
```
brunch build --production
```
Hint: use the following command for development, it will refresh page every time client-side files are changed:
```
brunch watch
```
 * Launch server-side scripts:
```
coffee server/index.coffee
```

### License
The MIT License (MIT)

Copyright (c) 2014 Alexey Taktarov molefrog@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

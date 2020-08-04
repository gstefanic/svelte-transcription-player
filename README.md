# Svelte Transcription Player

This repository is part of my diploma thesis. The main objective is to develop  web based application that would display transcription of an audio file and mark current position in real time. I choose to develop in [Svelte](https://svelte.dev/) framework - hence the name 'Svelte Transcription Player'. There sould also be an easy to use interface for fast edition of transcription. The idea is do make an easy to embed HTML component that would communicate with backend. The widget would fetch audio file and transcription from the server.

# Getting Started

You can play with [demo](https://svelte-transcription-player.vercel.app/example) or go through [storybook](https://svelte-transcription-player.vercel.app/storybook). If you wish to use latest production version, you can skip to the [Usage](#usage) chapter.

## <a id="installation"></a>Installation

Clone this repository and install dependencies.

```bash
git clone https://github.com/gstefanic/svelte-transcription-player.git
cd svelte-transcription-player
npm install
```

*Note that you will need to have [Node.js](https://nodejs.org) installed.*

Then you can start [webpack](https://webpack.js.org/) dev server:

```bash
npm run dev # navigate to localhost:8080/example to see component in action
```

... or build the component:

```bash
npm run build # output is a single index.js file in ./public directory
```

Note that when you run dev server, example page (content of `.example` directory) is generated. So if you edit example page you have to rerun dev server to apply changes. Read more about example page [bellow](#example-page).

# <a id="usage"></a>Usage

Include bundeled component `index.js` file into your HTML page. If you wish to use latest production release from this repository include the following line inside `<head>` tag.

```HTML
<script async src="https://svelte-transcription-player.vercel.app"></script>
```

After that, one can access component contructor via `window.TranscriptionPlayer` and `TranscriptionPlayer`.

```javascript
new TranscriptionPlayer({
    target: document.body, // or any other HTMLElement
    props: {
        audio: './demo.mp3',
        transcription: './demo.json',
        // other properties
    }
});
```

Note that if you wish to load component into custom `HTMLElement`, you should wait until it is loaded, so move initialization inside `DOMContentLoaded` callback.

```javascript
document.addEventListener("DOMContentLoaded", function () {
    // Initialize component
});
```

By default the component loads in [view mode](https://svelte-transcription-player.vercel.app/storybook?path=/story/transcriptionplayer--view-only). If you wish to configure it in differet way, take a look at [next](#component-properties) chapter.

## Component properties

This chapter describes component parameters and their default values.

| Property | Type | Default | Description |
|:--------:|:----:|:-------:|-------------|
| `audio` | `string` | `undefined` | URL of audio file. |
| `transcription` | `string|array` | `[]` | URL of `.json` file or `array`. | 
| `fontSize` | `string` | `"normal"` | `"extra-small"`, `"small"`, `"normal"`, `"large"` or `"extra-large"`. |
| `fontConfigurable` | `boolean` | `false` | User can change font size. |
| `autoplay` | `boolean` | `true` | Play region when region is resized. |
| `autoplayConfigurable` | `boolean` | `true` | User can toggle `autoplay`. |
| `autoscroll` | `boolean` | `true` | Transcription scrolls automatically. |
| `autoplayConfigurable` | `boolean` | `true` | User can toggle `autoscroll`. |
| `importEnabled` | `boolean` | `false` | User can import transcription. |
| `exportEnabled` | `boolean` | `false` | User can export transcription. |
| `playerHeight` | `string` | `"normal"` | `"small"`, `"normal"` or `"large"`. |
| `backgroundColor` | `string` | `"#F0F8FF"` | Color of player and transcription background. |
| `primaryColor` | `string` | `"#4353FF"` | Color of play/pause button and player progress. |
| `secondaryColor` | `string` | `"#D9DCFF"` | Color of circle around play/pause button, player wave and transcription progress. |
| `regionColor` | `string` | `"#7F7FFF"` | Color of regions in edit view. |
| `onEdited` | `function` | `undefined` | Callback that is invoked when _done_ button is clicked. Editing is `enabled` if `onEdited` is function. `onEdited(transcription: array, approve: function, decline: function)` |

`onEdited` callback receives three parameters. The first parameter is transcription array. If transcription was successfully updated on the server side, `approve` callback should be called. If server changes transcription changed transcription can be passed to `approve` callback. `decline` callback should be called if server refused update.

```javascript
/* Example of onEdited function */
async function onEdited(transcription, approve, decline) {
    const {success, transcription: serverResponse} = await updateOnServer(transcription);
    if (success) {
        approve(serverResponse);
    } else {
        decline();
    }
}
```

## Transcription format

Transcription (imported via `transcription` propetry) must be an array or JSON file containing an 
array of objects that each contain text and timestamps.

Transcription line object supprts the following key value pairs:
- `text`: (required, `string`) a section of transcription.
- `start`: (optional, `number`) positive real number that marks the start of current section (in seconds).
- `end`: (optional, `number`) positive real number that marks the end of current section (in seconds).
- `color`: (optional, `string`) color of region.

```JSON
[
    {
        "text": "The snow glows white on the mountain tonight",
        "start": 13,
        "end": 17,
        "color": "#7F7FFF"
    }
]
```


# Develop

First fork, clone, or simply download project and install dependencies as described [above](#installation).

## <a id="example-page"></a>Example page
As mentioned [above](#installation), example page is dynamically generated from `.example` directory. It is automatically regenerated on every rerun of dev server and it can also be regenerated manually using 

```bash
npm run example
```

command. You can inspect `package.json` file to know what exactly happens when running this command, but in summary, contents of `.example` are coppied to `./public/example` and all files except `.example/index.html` are copied again to `./public` directory. This is done in this way so that when component is served statically (eg. using [Vercel](https://vercel.com)) example page could be reached on `https://<app-url>/example` (not only on `/example/index.html`).

By default, example page is not build when building the component for release. However, example page build commang is combined in the following npm run commands:

```bash
npm run dev # run webpack dev server and build example page
npm run build:example # build component and example page
npm run build:all # build component, storybook, and example page
```

Other npm commands (such as for cleaning example page) can be found in chapter [npm scripts](#npm-scripts).

## Storybook

> [Storybook](https://storybook.js.org/) is an open source tool for developing UI components in isolation for React, Vue, and Angular. It makes building stunning UIs organized and efficient.

Storybook sources for _Svelte Transcription Player_ can be found in `.storybook` directory. If you are new to storybook skip through [docs](https://storybook.js.org/docs/basics/introduction/). Similarly to example page, storybook build output directory is located in `./public/storybook` and all files except `index.html` are copied to `./public` directory as well. 

Npm commands that incorporate building of storybook sources:

```bash
npm run storybook # build storybook
npm run dev:storybook # run storybook webpack dev server
npm run build:storybook # build component and storybook
npm run build:all # build component, storybook, and example page
```

## <a id="npm-scripts"></a>NPM Stripts

NPM helper scripts are located in `./npm-scripts` directory. However, exposed run commands are defined in `package.json` file. 

## Deploying to the web

### With [vercel](https://zeit.co/now)

Install `vercel` if you haven't already:

```bash
npm install -g vercel
```

Then, from within your project folder:

```bash
vercel
```

### With [surge](https://surge.sh/)

Install `surge` if you haven't already:

```bash
npm install -g surge
```

Then, from within your project folder:

```bash
npm run build
surge public
```

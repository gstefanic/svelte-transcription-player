<script>
    import { highlightable } from './highlightable';
    export let text;
    export let sections;
    export let css;

    let containerWidth;
</script>

<style>
.container {
    width: 100%;
}
</style>
<div class="container" style="{css}"
    bind:offsetWidth={containerWidth} 
    use:highlightable={{text: text, sections: sections, containerWidth: containerWidth}}
    on:section-click
    on:word-click
    on:word-hold
    on:section-hold
    on:new-section
    on:start-resizing
    on:section-changed
    on:click|self
    />
<script>
    import Button from './Button';
    import Notifications from './Notifications';
    import { chooseJsonFile, isFunction, isAncestorOfNode } from './utils';
    import { default as JSON5 } from 'json5';
    import { fromEvent } from 'file-selector';
    import { onMount, getContext } from 'svelte';

    const log = console.log;

    let addNotification, transcriptionText, invalid, transcription, dropArea, canDrop;

    const { close: closeModal } = getContext('simple-modal'); 

    export let onImport;

    const _onImport = () => {
        if (transcriptionText && !invalid && isFunction(onImport)) {
            onImport(transcription);
            closeModal();
        }
    }

    const isValid = text => {
        if (text) {
            try {
                const arr = JSON5.parse(text);
                if (arr instanceof Array && arr.find(s => typeof s.text !== 'string' || s.text.length === 0) === undefined) {
                    transcription = arr;
                    invalid = false;
                } else {
                    invalid = true;
                }
            } catch (error) {
                invalid = true;
            }
        } else {
            invalid = false;
        }
    };

    $: isValid(transcriptionText);

    const onUploadFileClick = async () => {
        try {
            const result = await chooseJsonFile();
            if (result) {
                transcriptionText = result;
            }
        } catch (error) {
            addNotification({
                text: 'Invalid file type. Only JSON files are supported.',
                color: '#FF5757',
                duration: 5000,
            });
        }
    };

    const on = {
        dragover: event => {
            if (isAncestorOfNode(dropArea, event.target)) {
                canDrop = true;
            }
        },
        dragleave: event => {
            if (!isAncestorOfNode(dropArea, event.target)) {
                canDrop = false;
            }
        },
        drop: async event => {
            event.preventDefault();
            if (canDrop) {
                canDrop = false;
                const files = await fromEvent(event);
                if (files && files[0]) {
                    const file = files[0];
                    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                    if (ext === '.json') {
                        const text = await files[0].text();
                        if (typeof text === 'string') {
                            transcriptionText = text;
                        }
                    } else {
                        addNotification({
                            text: 'Invalid file type. Only JSON files are supported.',
                            color: '#FF5757',
                            duration: 5000,
                        });
                    }
                }
            }
        }
    };

    onMount(async () => {
        document.addEventListener('drop', on.drop);
        document.addEventListener('dragover', on.dragover);
        document.addEventListener('dragleave', on.dragleave);

        return () => {
            document.removeEventListener('drop', on.drop);
            document.removeEventListener('dragover', on.dragover);
            document.removeEventListener('dragleave', on.dragleave);
        }
    });

</script>

<Notifications bind:addNotification={addNotification}>
    <div class="container">
        <div style="display: flex;">
            <div style="flex: 1; align-self: flex-start;">
                <span class="title">Import transcription</span>
            </div>
        </div>
        <section class="transcription">
            <label for="transcription">Transcription:</label>
            <div class="textarea-wrapper" bind:this={dropArea} class:droppable={canDrop}>
                <textarea class:invalid name="transcription" rows="8" bind:value={transcriptionText}></textarea>
                {#if !transcriptionText}
                <span class="placeholder">
                    {canDrop ? 'Drop to import' : 'Type something or drag transcription file.'}
                </span>
                {/if}
            </div>
        </section>

        <section class="buttons">
            <Button height={25} onclick={onUploadFileClick}>Upload file</Button>
            <Button height={25} disabled={invalid || !transcriptionText} onclick={_onImport}>Import</Button>
        </section>
    </div>
</Notifications>

<style>
    .container {
        display: flex;
        flex-flow: column nowrap;
        font-size: 1rem;
    }

    .title {
        font-weight: 500;
        font-size: 1.38rem;
    }

    .transcription {
        margin-top: 0.5rem;
        width: 100%;
        height: 250px;
        overflow: auto;
    }
    
    .transcription > label {
        margin: 0.25rem 0;
    }

    .textarea-wrapper > textarea {
        resize: none;
        width: 100%;
    }

    .textarea-wrapper {
        position: relative;
    }

    .textarea-wrapper > .placeholder {
        color: #555; 
        position: absolute; 
        top: 50%; 
        left: 50%; 
        transform: translate(-50%, -50%);
    }

    .textarea-wrapper textarea:focus + .placeholder {
        visibility: hidden;
    }

    .textarea-wrapper > textarea.invalid {
        outline-color: #FF5757 !important;
    }

    .transcription .textarea-wrapper.droppable > textarea {
        outline-color:  #4353FF !important;
        outline-style: solid;
        outline-width: 2px;
        outline-offset: -2px;
    }

    .transcription .textarea-wrapper.droppable > .placeholder {
        color:  #4353FF !important;
    }

    /* .upload-file {
        position: relative;
        display: inline-block;
    }

    .upload-file > input[type="file"] {
        height: 0;
        overflow: hidden;
        width: 0;
        display: none;
    }

    [type="file"] + label {
        border: none;
        cursor: pointer;
        display: inline-block;
        font-weight: 400;
        outline: none;
        transition: all 0.3s;
        
        padding: 0 12.5px;
        position: relative;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);

        display: inline-block;
        height: 25px;
        background-color: #4353FF;
        border-radius: 12.5px;
        color: white;

        box-sizing: border-box;
        border: solid 2px transparent;
        line-height: normal;
		display: inline;
    }

    [type="file"] + label:active {
		border: solid 2px white;
	} */

    .buttons {
        display: flex;
        justify-content: space-between;
    }
</style>
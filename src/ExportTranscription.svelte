<script>
    import { copyTextToClipboard, download } from './utils';
    import Button from './Button';
    import Notifications from './Notifications';
    import { getContext } from 'svelte';

    const log = console.log;

    let addNotification;

    const { close: closeModal } = getContext('simple-modal'); 

    export let transcription = [];

    $: transcriptionText = JSON.stringify(transcription, null, '  ');

    const exportAsFile = () => {
        try {
            download(transcriptionText, `${(new Date).toISOString()}.json`, 'text/plain');
            addNotification({
                text: 'Transcription successfully exported.',
                duration: 2000,
            });
            // closeModal();
        } catch (error) {
            addNotification({
                text: 'Transcription could not be saved.',
                color: '#FF5757',
                duration: 5000,
            });
        }
    };

    const copyToClipboard = () => {
        copyTextToClipboard(transcriptionText);
        addNotification({
            text: 'Transcription was copied to clipboard.',
            duration: 2000,
        });
    };

</script>

<Notifications bind:addNotification={addNotification}>
    <div class="cntnr">
        <div style="display: flex;">
            <div style="flex: 1; align-self: flex-start;">
                <span class="title">Export transcription</span>
            </div>
        </div>
        <section class="transcription">
            <label for="transcription">Transcription:</label>
            <textarea name="transcription" readonly rows="8">{transcriptionText}</textarea>
        </section>

        <section class="buttons">
            <Button height={25} onclick={copyToClipboard}>Copy</Button>
            <Button height={25} onclick={exportAsFile}>Save as file</Button>
        </section>
    </div>
</Notifications>

<style>
    .cntnr {
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

    .transcription > textarea {
        resize: none;
        width: 100%;
    }

    .buttons {
        display: flex;
        justify-content: space-between;
    }
</style>
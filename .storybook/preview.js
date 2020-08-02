import { addParameters } from '@storybook/client-api';
import { MINIMAL_VIEWPORTS, DEFAULT_VIEWPORT } from '@storybook/addon-viewport';

addParameters({
  viewport: {
    viewports: MINIMAL_VIEWPORTS,
    defaultViewport: DEFAULT_VIEWPORT,
  },
});
import { afterEach } from '@jest/globals';
import { resetAppStateMock } from './react-native.mock';

// Tell React 19 it is running inside an act()-aware environment.
// (@testing-library/react sets this on import too; set it here for any
// test file that drives React without importing RTL first.)
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  resetAppStateMock();
});

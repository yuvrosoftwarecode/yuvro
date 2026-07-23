import { RestApiUtil } from './RestApiUtil';

const CODE_EXECUTOR_BASE_URL = import.meta.env.VITE_CODE_EXECUTOR_BASE_URL || 'http://localhost:8009';

class RestApiUtilCodeExecuter extends RestApiUtil {
    constructor() {
        super(CODE_EXECUTOR_BASE_URL);
    }
}

export const restApiUtilCodeExecuter = new RestApiUtilCodeExecuter();
export default restApiUtilCodeExecuter;

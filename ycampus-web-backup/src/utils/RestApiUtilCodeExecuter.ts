import { RestApiUtil } from './RestApiUtil';

const CODE_EXECUTOR_BASE_URL = import.meta.env.VITE_CODE_EXECUTOR_BASE_URL;

class RestApiUtilCodeExecuter extends RestApiUtil {
    constructor() {
        super(CODE_EXECUTOR_BASE_URL);
    }
}

export const restApiUtilCodeExecuter = new RestApiUtilCodeExecuter();
export default restApiUtilCodeExecuter;
export interface ProctoringData {
    cameraStream: MediaStream | null;
    screenStream: MediaStream | null;
    photoBlob: Blob | null;
    screenshotBlob: Blob | null;
}

let globalProctoringData: ProctoringData | null = null;

export const setGlobalProctoringData = (data: ProctoringData) => {
    globalProctoringData = data;
};

export const getGlobalProctoringData = (): ProctoringData | null => {
    return globalProctoringData;
};

export const clearGlobalProctoringData = () => {
    if (globalProctoringData) {
        globalProctoringData.cameraStream?.getTracks().forEach(t => t.stop());
        globalProctoringData.screenStream?.getTracks().forEach(t => t.stop());
        globalProctoringData = null;
    }
};

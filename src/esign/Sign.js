var Core = require('./core')

class Sign {
    constructor(company) {
        this.core = new Core(company)
    }
    
    async createByFile(fileId, title, signers) {
        var data = {
            docs: [
                {
                    fileId
                }
            ],
            signFlowConfig: {
                signFlowTitle: title,
                noticeConfig: {
                    noticeTypes: '1,2'
                },
                signConfig: {
                    availableSignClientTypes:'1'
                },
                autoFinish: true
            },
            signers: [
                /*
                {
                    signerType: 0,
                    psnSignerInfo: {
                        psnAccount:"18666076856"
                    },
                    signFields: [{
                        // customBizNum: '1',
                        fileId: fileId,
                        normalSignFieldConfig: {
                            // freeMode: true,
                            //autoSign: true,
                            signFieldStyle: 2,
                            signFieldPosition: {
                                acrossPageMode: 'ALL'
                            }
                        }
                    }]
                }
                */
            ]
        }
        for (var idx in signers) {
            var signer = signers[idx]
            var rec = {
                signConfig: {
                    signOrder: Number(idx) + 1
                },
                signerType: 0,
                psnSignerInfo: {
                    psnAccount: signer.phone
                },
                signFields: [{
                    // customBizNum: '1',
                    fileId: fileId,
                    normalSignFieldConfig: {
                        freeMode: true
                    }
                }]
            }
            if(signer.position) {
                rec.signFields[0].normalSignFieldConfig.freeMode = false
                rec.signFields[0].normalSignFieldConfig.psnSealStyles=1
                rec.signFields[0].normalSignFieldConfig.signFieldStyle=1
                rec.signFields[0].normalSignFieldConfig.signFieldPosition = {
                    acrossPageMode: 'AssignedPages',
                    positionPage: signer.position.page,
                    positionX: signer.position.x,
                    positionY: signer.position.y
                }
            }
            data.signers.push(rec)
        }
        return await this.core.post(`/v3/sign-flow/create-by-file`, data)
    }

    async signFlow(flowId) {
        return await this.core.get(`/v3/sign-flow/${flowId}/detail`)
    }

    async signFlowFile(flowId) {
        return await this.core.get(`/v3/sign-flow/${flowId}/file-download-url`)
    }
}
module.exports = Sign
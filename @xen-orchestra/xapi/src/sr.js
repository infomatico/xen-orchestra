const groupBy = require('lodash/groupBy')
const keyBy = require('lodash/keyBy')

module.exports = class Sr {
  async getUnhealthyVdiChainsLength(ref) {
    const vdiRefs = await this.getField('SR', ref, 'VDIs')
    const vdis = await this.getRecords('VDI', vdiRefs)
    const vdiByUuid = keyBy(vdis, 'uuid')

    const children = { __proto__: null }
    vdis.forEach(vdi => {
      const parent = vdi.sm_config['vhd-parent']
      if (parent !== undefined) {
        (children[parent] ?? (children[parent] = [])).push(vdi.$ref)
      }
    })

    return children
  }
}

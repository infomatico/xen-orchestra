import forEach from 'lodash.foreach'
import {hash, needsRehash, verify} from 'hashy'

import Collection from '../collection/redis'
import Model from '../model'

// ===================================================================

const PERMISSIONS = {
  none: 0,
  read: 1,
  write: 2,
  admin: 3
}

// ===================================================================

export default class User extends Model {
  static async checkPassword (user, password) {
    const hash = user.pw_hash

    if (!(hash && await verify(password, hash))) {
      return false
    }

    // There might be no hash if the user authenticate with another
    // method (e.g. LDAP).
    if (needsRehash(hash)) {
      await this.setPassword(password)
    }

    return true
  }

  async checkPassword (password) {
    return await User.checkPassword(this.properties, password)
  }

  hasPermission (permission) {
    return PERMISSIONS[this.get('permission')] >= PERMISSIONS[permission]
  }

  setPassword (password) {
    return hash(password).then(hash => {
      return this.set('pw_hash', hash)
    })
  }
}

User.prototype.default = {
  permission: 'none'
}

// -------------------------------------------------------------------

export class Users extends Collection {
  get Model () {
    return User
  }

  async create (email, properties = {}) {
    // Avoid duplicates.
    if (await this.exists({email})) {
      throw new Error(`the user ${email} already exists`)
    }

    // Password is a special case.
    const password = properties.password
    delete properties.password

    // Adds the email to the user's properties.
    properties.email = email

    // Create the user object.
    const user = new User(properties)

    // Sets the password if any.
    if (password != null) {
      await user.setPassword(password)
    }

    // Adds the user to the collection.
    return await this.add(user)
  }

  async save (user) {
    // Serializes.
    user.groups = JSON.stringify(user.groups)

    return await this.update(user)
  }

  async get (properties) {
    const users = await super.get(properties)

    // Deserializes
    forEach(users, user => {
      const {groups} = user
      try {
        user.groups = groups ? JSON.parse(groups) : []
      } catch (_) {
        console.warn('cannot parse user.groups:', groups)
        user.groups = []
      }
    })

    return users
  }
}

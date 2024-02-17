import bcrypt from 'bcrypt'
import User from '../models/user.model.js'
import jwt from 'jsonwebtoken'
import { GMSGetPeopleByAuthCode } from '../helpers/gms-api.js'


var result = {
    code: 200,
    data: null,
    message: null
}

export const APIService = async (params) => {
    let user = await GMSGetPeopleByAuthCode(params.authCode)
    if (!user) {
        return null;
    }

    return user
}


export const loginService = async (params) => {

    let user = await User.findOne({
        where: {
            email: params.email
        }
    })
    
    let match = await bcrypt.compare(params.password, user.password)
    if (!match) {
        throw new Error("Wrong")
    }
    
    let uuid = user.gmsUserID
    let name = user.name
    let id = user.id
    let email = user.email

    

    let accessToken = jwt.sign({id, name, email, uuid}, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '20m'
    })

    let refresher = jwt.sign({id, name, email, uuid}, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: '20w'
    })

        
    
    await User.update({
        refreshToken: refresher
    },
    {
        where: {
            uuid: uuid
        }
    })

    result.data = {
        refresher: refresher,
        accessToken: accessToken
    }

    return result
}

export const registerService = async (params) => {

    let { name, email, password, confPassword, username } = params

    if (password !== confPassword) {
        result.code = 400
        result.message = "Password does not match"
        return result
    }
    let salt = await bcrypt.genSalt()
    let hashedPassword = await bcrypt.hash(password, salt)

    await User.create({
        name: name,
        username: username,
        email: email,
        password: hashedPassword
    })

    result.message = "User is successfully registered"
    return result
}

export const getProfileService = async (params) => {

    

    if (!params) {
        result.code = 404
        return result
    }

    result.code = 200
    result.data = {
        uuid: params.uuid,
        name: params.name,
        email: params.email
    }

    return result
}

export const logoutService = async (params) => {

    let refreshToken = params
    if (!refreshToken) return response.notFound('user', res)
    let user = await User.findOne({
        where: {
            refreshToken: refreshToken
        }
    })
    if (!user) {
        result.code = 404
        result.message = "user"
        return result 
    }

    let userID = user.uuid
    await User.update({refresh_token: null}, {
        where: {
            uuid: userID
        }
    })
    
    result.message = "Successfully logged out"
    return result
    
}
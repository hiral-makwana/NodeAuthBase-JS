const { User, UserMeta } = require('../models');
const bcrypt = require('bcrypt');
const { sendEmail } = require('../helper/email.helper');
const { keyName, requestType } = require("../helper/constant");
const { generateRandomOtp, generateHash, generateOtpHtmlMessage } = require('../helper/utils');
const { status } = require('../helper/constant');
const { generateToken } = require('../helper/auth.helper');
const path = require('path');
const jwt = require('jsonwebtoken');

const otpHtmlTemplatePath = path.join('src/email_templates', 'otpTemplate.html');
const resendOtpTemplatePath = path.join('src/email_templates', 'resendOtpTemplate.html');

exports.registerUser = async (req, res) => {
    try {
        const reqData = req.body;
        let jsonObj = {
            firstName: reqData.firstName,
            lastName: reqData.lastName,
            email: reqData.email,
            password: reqData.password,
            phoneNumber: reqData.phoneNumber,
            roleId: reqData.roleId ? reqData.roleId : 2,
            isVerified: false,
            ...reqData
        };

        const hashedPassword = await generateHash(reqData.password);
        jsonObj.password = hashedPassword;
        let user = await User.findOne({ where: { email: reqData.email } });
        if (user && user.status == status.DEACTIVE) {
            await User.update(jsonObj, { where: { email: reqData.email } });
            return res.status(200).send({ status: true, message: res.__("SUCCESS_UPDATE") });
        } else if (user && user.status == status.ACTIVE) {
            return res.status(200).send({ status: true, message: res.__("ALREADY_REGISTERED") });
        } else {
            let createUser = await User.create(jsonObj);
            if (createUser) {
                let getRandomOtp = await generateRandomOtp(global.config.OTP_LENGTH);
                let metaObj = {
                    userId: createUser.dataValues.id,
                    key: keyName,
                    value: getRandomOtp.toString()
                };
                await UserMeta.create(metaObj);
                let customOtpHtmlTemplate = otpHtmlTemplatePath;
                if (global.config.CUSTOM_TEMPLATE == true) {
                    if (reqData.customOtpHtmlTemplate == undefined || reqData.customOtpHtmlTemplate == '') {
                        return res.status(200).send({ status: true, message: res.__("TEMPLATE_NOT_DEFINE") });
                    } else {
                        customOtpHtmlTemplate = reqData.customOtpHtmlTemplate;
                    }
                }
                const templatedata = {
                    username: jsonObj.firstName,
                    otpCode: getRandomOtp
                };
                const otpHtmlMessage = await generateOtpHtmlMessage(jsonObj.email, global.config.CUSTOM_TEMPLATE, customOtpHtmlTemplate, "Registration done successfully. Here is your OTP for verification.", templatedata);

                return res.status(200).send({ status: true, message: res.__("SUCCESS_CREATE") });
            } else {
                return res.status(500).send({ status: false, message: res.__("FAIL_CREATE") });
            }
        }
    } catch (e) {
        console.log(e);
        return res.status(500).send({ status: false, message: res.__("SERVER_ERR", e.message) });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { type, email, otp } = req.body;

        if (type !== requestType.REGISTER) {
            return res.status(400).json({
                status: false,
                message: res.__("INVALID_TYPE") + `'${requestType.REGISTER}'`,
            });
        }

        const user = await User.findOne({ where: { email }, raw: true });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: res.__("USER_NOT_FOUND"),
            });
        }
        const userMeta = await UserMeta.findOne({ where: { userId: user.id, key: keyName } });
        if (!userMeta || userMeta.value !== otp.toString()) {
            return res.status(400).json({
                status: false,
                message: res.__("INVALID_OTP"),
            });
        }

        await User.update({ status: status.ACTIVE, isVerified: true }, { where: { email } });
        await UserMeta.update({ value: null }, { where: { userId: user.id, key: keyName } })
        return res.status(200).json({
            status: true,
            message: res.__("OTP_VERIFIED"),
            isVerified: true,
            loginType: requestType.REGISTER,
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: false,
            message: res.__("SERVER_ERR") + e.message,
        });
    }
};

exports.resendOTP = async (req, res) => {
    try {
        const { type, email, customOtpHtmlTemplate } = req.body;

        if (type !== requestType.FORGOT) {
            return res.status(400).json({
                status: false,
                message: res.__("INVALID_TYPE") + `'${requestType.FORGOT}'`,
            });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: res.__("USER_NOT_FOUND"),
            });
        }

        const newOTP = await generateRandomOtp(global.config.OTP_LENGTH);

        await UserMeta.update({ value: newOTP.toString() }, { where: { userId: user.id, key: keyName } });

        let customTemplate = resendOtpTemplatePath;
        if (global.config.CUSTOM_TEMPLATE == true) {
            if (customOtpHtmlTemplate == undefined || customOtpHtmlTemplate == '') {
                return res.status(200).send({ status: true, message: res.__("TEMPLATE_NOT_DEFINE") });
            } else {
                customTemplate = customOtpHtmlTemplate;
            }
        }
        const templatedata = {
            username: user.firstName,
            otpCode: newOTP
        };
        const otpHtmlMessage = await generateOtpHtmlMessage(user.email, global.config.CUSTOM_TEMPLATE, customTemplate, "OTP Verification.", templatedata);

        return res.status(200).json({
            status: true,
            message: res.__("SENT_OTP"),
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: false,
            message: res.__("SERVER_ERR") + e.message,
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: res.__("USER_NOT_FOUND"),
            });
        }

        const newOTP = await generateRandomOtp(global.config.OTP_LENGTH);

        await UserMeta.update({ value: newOTP.toString() }, {
            where: { userId: user.id, key: keyName },
        });

        const otpHtmlMessage = `<p>Your new OTP code for update password: <b>${newOTP}</b></p>`;
        sendEmail(email, "Forgot Password OTP", otpHtmlMessage);

        return res.status(200).json({
            status: true,
            message: res.__("SENT_OTP"),
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: false,
            message: res.__("SERVER_ERR") + e.message,
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: res.__("USER_NOT_FOUND"),
            });
        }

        const hashedPassword = await generateHash(password);

        await Promise.all([
            User.update({ password: hashedPassword }, { where: { id: user.id } }),
            UserMeta.update({ value: null }, { where: { userId: user.id, key: keyName } }),
        ]);

        return res.status(200).json({
            status: true,
            message: res.__("RESET_PASSWORD"),
            data: {
                userId: user.id,
                email: user.email,
            },
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: false,
            message: res.__("SERVER_ERR") + e.message,
        });
    }
};

exports.logIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({
                status: false,
                message: res.__("INVALID_EMAIL"),
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                status: false,
                message: res.__("INVALID_EMAIL"),
            });
        }

        const isVerified = user.isVerified ? true : false;
        if (!isVerified) {
            return res.status(401).json({
                status: false,
                message: res.__("NOT_VERIFIED"),
            });
        }

        const token = generateToken({ id: user.id, email: user.email });

        return res.status(200).json({
            status: true,
            message: res.__("LOGIN_SUCCESS"),
            data: {
                userId: user.id,
                email: user.email,
                token,
            },
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: false,
            message: res.__("SERVER_ERR") + e.message,
        });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { type, token } = req.body;

        if (type !== requestType.REFRESH) {
            return res.status(400).json({
                status: false,
                message: res.__("INVALID_TYPE") + `'${requestType.REFRESH}'`,
            });
        }
        if (!token) {
            return res.status(404).json({
                status: false,
                message: res.__("TOKEN_NOT_FOUND"),
            });
        }

        jwt.verify(token, global.config.JWT_SECRET, (err, user) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        status: false,
                        message: res.__("TOKEN_EXPIRED")
                    });
                } else {
                    return res.status(401).json({
                        status: false,
                        message: res.__("INVALID_TOKEN")
                    });
                }
            }

            let refreshToken = generateToken({ id: user.id, email: user.email });

            return res.status(200).json({
                status: true,
                message: res.__("TOKEN_RESET"),
                data: {
                    userId: user.id,
                    email: user.email,
                    token: refreshToken,
                },
            });
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: false,
            message: res.__("SERVER_ERR") + e.message,
        });
    }
};

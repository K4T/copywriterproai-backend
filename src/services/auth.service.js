const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');

const config = require('../config/config');
const twilio = require('twilio')(config.twilio.twilioAccountSID, config.twilio.twilioAuthToken);

const requestOneTimePassword = async (phoneNumber) => {
  try {
    const phoneNumberVerificationData = await twilio.verify
      .services(config.twilio.twilioServiceVerificationSID)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms',
      });
    return phoneNumberVerificationData;
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Something went wrong!');
  }
};

const verifyPhoneNumber = async (phoneNumber, code) => {
  try {
    const phoneNumberVerificationData = await twilio.verify
      .services(config.twilio.twilioServiceVerificationSID)
      .verificationChecks.create({ to: phoneNumber, code });

    return phoneNumberVerificationData;
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Something went wrong!');
  }
};

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUser = async (identity, password) => {
  const user = await userService.getUser(identity);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  } else if(!user.isVerified) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Account not verified!');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

module.exports = {
  loginUser,
  logout,
  refreshAuth,
  resetPassword,
  requestOneTimePassword,
  verifyPhoneNumber,
};

const express=require("express");
const router=express.Router();
const authMiddleware=require("../middlewares/auth.middleware");

const authController=require("../controllers/auth.controller")

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/logout", authMiddleware.authUser, authController.logoutUser);
router.get("/get-me", authMiddleware.authUser, authController.getMeController);

module.exports = router;
const User = require("../Models/Users");
const NGO = require("../Models/Ngo");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ---------------- USER SIGNUP ----------------
const signupUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, mobile } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      firstName,
      lastName,
      email,
      password: hashed,
      mobile,
    });
    res.status(201).json({ msg: "User signup successful" });
  } catch (err) {
    console.error(err); // helpful during development
    res.status(500).json({ msg: "Server error" });
  }
};

// ---------------- NGO SIGNUP ----------------
const signupNGO = async (req, res) => {
  try {
    const {
      name,
      registrationNumber,
      email,
      password,
      mobile,
      address,
      itemsAccepted,
    } = req.body;

    console.log(req.body);
    const exists = await NGO.findOne({ email });
    if (exists) return res.status(400).json({ msg: "NGO already exists" });

    const hashed = await bcrypt.hash(password, 10);

    await NGO.create({
      name,
      registrationNumber,
      email,
      password: hashed,
      mobile,
      address,
      itemsAccepted,
    });

    res.status(201).json({ msg: "NGO signup successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = email.trim().toLowerCase();

    // Try logging in as User
    let account = await User.findOne({ email: trimmedEmail });
    let type = "user";

    // If not found, try as NGO
    if (!account) {
      account = await NGO.findOne({ email: trimmedEmail });
      type = "ngo";
    }

    if (!account) return res.status(400).json({ msg: "Invalid credentials" });

    const match = await bcrypt.compare(password, account.password);
    if (!match) return res.status(400).json({ msg: "Invalid credentials" });

    // Store the user's name in the token for easy access
    const userName = account.firstName || account.name || "";
    // const userLastName = account.lastName || "";
    
    const token = jwt.sign({ 
      id: account._id, 
      type,
      name: userName,
    }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Updated cookie settings to fix CORS issues
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Changed to 'none' for cross-site requests in production
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/"
      })
      .json({ msg: "Login successful", type, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


// ---------------- LOGOUT ----------------
const logout = (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Changed to match login cookie settings
      path: "/"
    })
    .json({ msg: "Logged out successfully" });
};

module.exports = {
  signupUser,
  signupNGO,
  login,
  logout,
};

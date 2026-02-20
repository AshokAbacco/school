// server/src/modules/finance/finance.controller.js

export const getFinanceDashboard = async (req, res) => {
  res.json({
    message: "Finance Dashboard Working ✅",
    user: req.user,
  });
};

export const createFee = async (req, res) => {
  res.json({
    message: "Fee Created Successfully ✅",
    data: req.body,
  });
};

export const getAllFees = async (req, res) => {
  res.json({
    message: "All Fees List ✅",
  });
};

export const collectPayment = async (req, res) => {
  res.json({
    message: "Payment Collected ✅",
    data: req.body,
  });
};

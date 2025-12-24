# Predictive Analytics Model Documentation

## Overview

The Student Risk Prediction Model identifies students who may be at risk of falling behind academically. This document explains how the model works, its limitations, and how educators should interpret and use predictions.

> ⚠️ **IMPORTANT**: This model is designed to ASSIST educators, not replace professional judgment. All predictions should be reviewed by qualified educators before taking action.

## How the Model Works

### What the Model Predicts

The model predicts the probability that a student will "fall behind" within the next 30 days. "Falling behind" is defined as:

- A 10%+ decrease in overall mastery
- OR falling below 50% mastery in core skills

### Risk Levels

| Level        | Score Range | Meaning                                                 |
| ------------ | ----------- | ------------------------------------------------------- |
| **Low**      | 0-30%       | Student is on track; routine monitoring                 |
| **Moderate** | 30-50%      | Some warning signs; increased attention recommended     |
| **High**     | 50-70%      | Multiple risk factors present; intervention recommended |
| **Critical** | 70-100%     | Urgent attention needed; immediate action recommended   |

### Feature Categories

The model considers 15 features across 4 categories:

#### Academic Factors (40% weight)

- **Current Mastery Level**: Overall mastery percentage across skills
- **Mastery Trend (7-day)**: Change in mastery over the past week
- **Skill Gaps Count**: Number of skills below 50% mastery
- **Correct First Attempt Rate**: How often answers are correct on first try
- **Mastery vs Class**: Performance relative to classroom peers

#### Engagement Factors (30% weight)

- **Days Since Last Session**: How long since the student was active
- **Session Frequency (7-day)**: Number of learning sessions in past week
- **Average Session Duration**: Time spent in typical sessions
- **Completion Rate**: Percentage of started activities that are completed

#### Behavioral Factors (20% weight)

- **Frustration Signals**: Detected signs of frustration (rapid incorrect answers, abandonment)
- **Session Abandonment Rate**: How often sessions are left incomplete
- **Help-Seeking Behavior**: Whether the student uses help features appropriately

#### Temporal Factors (10% weight)

- **Time Since Strong Performance**: Days since last session with good performance
- **Weekend/Off-hours Activity**: Learning patterns outside school hours
- **Consistency of Engagement**: Regularity of learning sessions

## Interpreting Predictions

### Risk Score

The risk score (0-100%) represents the model's estimated probability that the student will fall behind. Higher scores indicate higher probability.

**Example**: A 65% risk score means the model estimates a 65% probability the student will fall behind without intervention.

### Confidence

The confidence score (0-100%) indicates how certain the model is about its prediction.

- **High confidence (>80%)**: Prediction is reliable based on available data
- **Medium confidence (50-80%)**: Some uncertainty; consider additional information
- **Low confidence (<50%)**: Limited data available; use with caution

### Risk Factors

Each prediction includes the top risk factors contributing to the score. These are:

- Ranked by their contribution to the overall risk
- Categorized by severity (high, medium, low)
- Accompanied by specific recommendations

**Example Risk Factor**:

```
Factor: Days Since Last Session = 8 days
Severity: High
Contribution: 25%
Recommendation: Contact family about student absence
```

### Protective Factors

Positive factors that reduce risk are also highlighted:

- These are strengths that may help the student succeed
- Can inform intervention strategies (build on strengths)

## Model Limitations

### What the Model Cannot Do

1. **Diagnose learning disabilities**: Risk predictions are NOT diagnoses
2. **Replace human judgment**: Predictions are one input among many
3. **Predict individual events**: Predictions are probabilistic, not deterministic
4. **Account for external factors**: Home life, health, etc. are not captured

### Known Limitations

| Limitation                 | Impact                                        | Mitigation                                    |
| -------------------------- | --------------------------------------------- | --------------------------------------------- |
| **Historical bias**        | Model may reflect past educational inequities | Regular bias monitoring; fairness constraints |
| **Data gaps**              | Missing data reduces accuracy                 | Confidence scores reflect data quality        |
| **Concept drift**          | Student behavior changes over time            | Continuous monitoring; regular retraining     |
| **Population differences** | May perform differently across groups         | Fairness testing across demographics          |

### When Predictions May Be Less Accurate

- **New students**: Limited historical data
- **After long breaks**: Baseline behavior may have changed
- **During major transitions**: Grade changes, school changes
- **Unusual circumstances**: Pandemic, natural disasters, etc.

## Fairness and Bias

### Bias Monitoring

The model is continuously monitored for bias across:

- Race/Ethnicity
- Gender
- English Language Learner status
- IEP/504 status
- Socioeconomic indicators

### Fairness Metrics

We track several fairness metrics:

| Metric                 | What It Measures                                 | Target         |
| ---------------------- | ------------------------------------------------ | -------------- |
| **Demographic Parity** | Equal selection rates across groups              | <20% disparity |
| **Equal Opportunity**  | Equal true positive rates across groups          | <20% disparity |
| **Predictive Parity**  | Equal precision across groups                    | <20% disparity |
| **Calibration**        | Predictions match outcomes equally across groups | <10% error     |

### What Happens If Bias Is Detected

1. Alert sent to ML team and administrators
2. Investigation of root cause
3. Potential actions:
   - Adjust decision thresholds
   - Add fairness constraints to model
   - Retrain with balanced data
   - Manual review for affected populations

## Best Practices for Educators

### DO

✅ **Use predictions as one input** among many in your assessment  
✅ **Consider the context** you know about the student  
✅ **Review risk factors** to understand what's driving the prediction  
✅ **Document your observations** to improve future predictions  
✅ **Involve families** as partners in supporting the student  
✅ **Follow up on interventions** and track outcomes

### DON'T

❌ **Label students** based on risk scores  
❌ **Make assumptions** about why a student is at risk  
❌ **Ignore your professional judgment** when it differs from the model  
❌ **Share predictions** with students or families without context  
❌ **Use predictions for punitive purposes**

### Communicating with Families

When discussing concerns identified through predictive analytics:

1. **Focus on behaviors, not scores**: "We've noticed Maya hasn't been as active on the learning platform lately..."
2. **Invite collaboration**: "What are you seeing at home?"
3. **Discuss specific supports**: Focus on the intervention, not the prediction
4. **Emphasize partnership**: "Together we can help..."

### Documentation

When taking action based on predictions:

1. Document the prediction that prompted attention
2. Record your own observations and assessment
3. Note the intervention selected and rationale
4. Track outcomes to help improve the system

## Privacy and Compliance

### FERPA Compliance

- Predictions are part of education records
- Parents/guardians have right to access
- Data is not shared outside educational purpose
- All access is logged and auditable

### Data Retention

- Active predictions: Kept for current school year
- Historical predictions: Retained for 3 years
- De-identified data: May be retained for research

### Who Can Access Predictions

| Role                   | Access Level                        |
| ---------------------- | ----------------------------------- |
| Classroom Teacher      | Own students' predictions           |
| Counselor              | Caseload students + risk factors    |
| Administrator          | Aggregate data only                 |
| Special Ed Coordinator | IEP students + intervention history |

## Providing Feedback

Your feedback improves the model:

### Accuracy Feedback

When a prediction doesn't match reality:

- "This student was flagged as high-risk but performed well"
- "This student wasn't flagged but struggled significantly"

### Usability Feedback

- Are risk factors helpful and actionable?
- Are intervention recommendations appropriate?
- Is the explanation clear and understandable?

### Bias Feedback

If you notice patterns suggesting bias:

- Document the pattern you're observing
- Report to your administrator or ML team
- Provide specific examples when possible

## Technical Details

### Model Architecture

- **Algorithm**: Gradient Boosting Classifier (GBM)
- **Calibration**: Isotonic regression for probability calibration
- **Training Data**: Historical student performance outcomes
- **Update Frequency**: Model retrained quarterly; predictions updated daily

### Performance Metrics (Current Model)

| Metric                | Value | Interpretation                             |
| --------------------- | ----- | ------------------------------------------ |
| **AUC-ROC**           | 0.82  | Good discrimination ability                |
| **Recall**            | 0.85  | Catches 85% of at-risk students            |
| **Precision**         | 0.72  | 72% of flagged students were truly at risk |
| **Calibration Error** | 0.04  | Probabilities are well-calibrated          |

### Model Version History

| Version | Date    | Changes                                       |
| ------- | ------- | --------------------------------------------- |
| 1.0.0   | 2024-01 | Initial release                               |
| 1.1.0   | 2024-04 | Added temporal features; improved calibration |
| 1.2.0   | 2024-07 | Fairness constraints added; reduced bias      |

## Support and Resources

### Getting Help

- **Technical issues**: Contact IT support
- **Interpretation questions**: Consult with counselor or administrator
- **Training requests**: Contact professional development coordinator

### Additional Resources

- [Intervention Catalog](./interventions.md) - Evidence-based intervention options
- [Bias Monitoring Dashboard](./bias-monitoring.md) - View current fairness metrics
- [Model Updates Log](./model-changelog.md) - Track model changes

---

_Last updated: December 2024_  
_Model version: 1.2.0_  
_Document version: 1.0_

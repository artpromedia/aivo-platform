-- ═══════════════════════════════════════════════════════════════════════════════
-- POPULATE DIM_TIME
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Generates 10 years of dates (2020-01-01 to 2029-12-31).
-- Run once during initial warehouse setup.
--

-- US Federal Holidays (simplified - adjust for actual observed dates)
CREATE OR REPLACE FUNCTION is_us_federal_holiday(d DATE) RETURNS BOOLEAN AS $$
BEGIN
  -- New Year's Day (Jan 1)
  IF EXTRACT(MONTH FROM d) = 1 AND EXTRACT(DAY FROM d) = 1 THEN RETURN TRUE; END IF;
  
  -- MLK Day (3rd Monday of January)
  IF EXTRACT(MONTH FROM d) = 1 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) BETWEEN 15 AND 21 THEN RETURN TRUE; END IF;
  
  -- Presidents Day (3rd Monday of February)
  IF EXTRACT(MONTH FROM d) = 2 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) BETWEEN 15 AND 21 THEN RETURN TRUE; END IF;
  
  -- Memorial Day (Last Monday of May)
  IF EXTRACT(MONTH FROM d) = 5 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) >= 25 THEN RETURN TRUE; END IF;
  
  -- Juneteenth (June 19)
  IF EXTRACT(MONTH FROM d) = 6 AND EXTRACT(DAY FROM d) = 19 THEN RETURN TRUE; END IF;
  
  -- Independence Day (July 4)
  IF EXTRACT(MONTH FROM d) = 7 AND EXTRACT(DAY FROM d) = 4 THEN RETURN TRUE; END IF;
  
  -- Labor Day (1st Monday of September)
  IF EXTRACT(MONTH FROM d) = 9 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) <= 7 THEN RETURN TRUE; END IF;
  
  -- Columbus/Indigenous Peoples Day (2nd Monday of October)
  IF EXTRACT(MONTH FROM d) = 10 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) BETWEEN 8 AND 14 THEN RETURN TRUE; END IF;
  
  -- Veterans Day (November 11)
  IF EXTRACT(MONTH FROM d) = 11 AND EXTRACT(DAY FROM d) = 11 THEN RETURN TRUE; END IF;
  
  -- Thanksgiving (4th Thursday of November)
  IF EXTRACT(MONTH FROM d) = 11 AND EXTRACT(DOW FROM d) = 4 
     AND EXTRACT(DAY FROM d) BETWEEN 22 AND 28 THEN RETURN TRUE; END IF;
  
  -- Christmas (December 25)
  IF EXTRACT(MONTH FROM d) = 12 AND EXTRACT(DAY FROM d) = 25 THEN RETURN TRUE; END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get holiday name
CREATE OR REPLACE FUNCTION get_us_holiday_name(d DATE) RETURNS VARCHAR AS $$
BEGIN
  IF EXTRACT(MONTH FROM d) = 1 AND EXTRACT(DAY FROM d) = 1 THEN RETURN 'New Year''s Day'; END IF;
  IF EXTRACT(MONTH FROM d) = 1 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) BETWEEN 15 AND 21 THEN RETURN 'Martin Luther King Jr. Day'; END IF;
  IF EXTRACT(MONTH FROM d) = 2 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) BETWEEN 15 AND 21 THEN RETURN 'Presidents Day'; END IF;
  IF EXTRACT(MONTH FROM d) = 5 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) >= 25 THEN RETURN 'Memorial Day'; END IF;
  IF EXTRACT(MONTH FROM d) = 6 AND EXTRACT(DAY FROM d) = 19 THEN RETURN 'Juneteenth'; END IF;
  IF EXTRACT(MONTH FROM d) = 7 AND EXTRACT(DAY FROM d) = 4 THEN RETURN 'Independence Day'; END IF;
  IF EXTRACT(MONTH FROM d) = 9 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) <= 7 THEN RETURN 'Labor Day'; END IF;
  IF EXTRACT(MONTH FROM d) = 10 AND EXTRACT(DOW FROM d) = 1 
     AND EXTRACT(DAY FROM d) BETWEEN 8 AND 14 THEN RETURN 'Columbus Day'; END IF;
  IF EXTRACT(MONTH FROM d) = 11 AND EXTRACT(DAY FROM d) = 11 THEN RETURN 'Veterans Day'; END IF;
  IF EXTRACT(MONTH FROM d) = 11 AND EXTRACT(DOW FROM d) = 4 
     AND EXTRACT(DAY FROM d) BETWEEN 22 AND 28 THEN RETURN 'Thanksgiving'; END IF;
  IF EXTRACT(MONTH FROM d) = 12 AND EXTRACT(DAY FROM d) = 25 THEN RETURN 'Christmas Day'; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if leap year
CREATE OR REPLACE FUNCTION is_leap_year(y INTEGER) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (y % 4 = 0 AND y % 100 != 0) OR (y % 400 = 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Day of week names
CREATE OR REPLACE FUNCTION day_of_week_name(dow INTEGER) RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE dow
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Month names
CREATE OR REPLACE FUNCTION month_name(m INTEGER) RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE m
    WHEN 1 THEN 'January'
    WHEN 2 THEN 'February'
    WHEN 3 THEN 'March'
    WHEN 4 THEN 'April'
    WHEN 5 THEN 'May'
    WHEN 6 THEN 'June'
    WHEN 7 THEN 'July'
    WHEN 8 THEN 'August'
    WHEN 9 THEN 'September'
    WHEN 10 THEN 'October'
    WHEN 11 THEN 'November'
    WHEN 12 THEN 'December'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Month name short
CREATE OR REPLACE FUNCTION month_name_short(m INTEGER) RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE m
    WHEN 1 THEN 'Jan'
    WHEN 2 THEN 'Feb'
    WHEN 3 THEN 'Mar'
    WHEN 4 THEN 'Apr'
    WHEN 5 THEN 'May'
    WHEN 6 THEN 'Jun'
    WHEN 7 THEN 'Jul'
    WHEN 8 THEN 'Aug'
    WHEN 9 THEN 'Sep'
    WHEN 10 THEN 'Oct'
    WHEN 11 THEN 'Nov'
    WHEN 12 THEN 'Dec'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate the table
INSERT INTO dim_time (
  date_key,
  full_date,
  day_of_week,
  day_of_week_name,
  day_of_month,
  day_of_year,
  is_weekend,
  is_weekday,
  week_of_year,
  iso_week_start,
  iso_week_end,
  month_of_year,
  month_name,
  month_name_short,
  month_start,
  month_end,
  days_in_month,
  quarter,
  quarter_name,
  quarter_start,
  quarter_end,
  year,
  year_start,
  year_end,
  is_leap_year,
  academic_year,
  academic_semester,
  is_summer_break,
  is_us_federal_holiday,
  us_holiday_name,
  fiscal_year,
  fiscal_quarter,
  fiscal_month
)
SELECT
  -- date_key: YYYYMMDD
  TO_CHAR(d, 'YYYYMMDD')::INTEGER as date_key,
  
  -- full_date
  d as full_date,
  
  -- day_of_week (0=Sunday)
  EXTRACT(DOW FROM d)::SMALLINT as day_of_week,
  
  -- day_of_week_name
  day_of_week_name(EXTRACT(DOW FROM d)::INTEGER) as day_of_week_name,
  
  -- day_of_month
  EXTRACT(DAY FROM d)::SMALLINT as day_of_month,
  
  -- day_of_year
  EXTRACT(DOY FROM d)::SMALLINT as day_of_year,
  
  -- is_weekend
  EXTRACT(DOW FROM d) IN (0, 6) as is_weekend,
  
  -- is_weekday
  EXTRACT(DOW FROM d) NOT IN (0, 6) as is_weekday,
  
  -- week_of_year (ISO week)
  EXTRACT(WEEK FROM d)::SMALLINT as week_of_year,
  
  -- iso_week_start (Monday of ISO week)
  d - EXTRACT(ISODOW FROM d)::INTEGER + 1 as iso_week_start,
  
  -- iso_week_end (Sunday of ISO week)
  d - EXTRACT(ISODOW FROM d)::INTEGER + 7 as iso_week_end,
  
  -- month_of_year
  EXTRACT(MONTH FROM d)::SMALLINT as month_of_year,
  
  -- month_name
  month_name(EXTRACT(MONTH FROM d)::INTEGER) as month_name,
  
  -- month_name_short
  month_name_short(EXTRACT(MONTH FROM d)::INTEGER) as month_name_short,
  
  -- month_start
  DATE_TRUNC('month', d)::DATE as month_start,
  
  -- month_end
  (DATE_TRUNC('month', d) + INTERVAL '1 month' - INTERVAL '1 day')::DATE as month_end,
  
  -- days_in_month
  EXTRACT(DAY FROM (DATE_TRUNC('month', d) + INTERVAL '1 month' - INTERVAL '1 day'))::SMALLINT as days_in_month,
  
  -- quarter
  EXTRACT(QUARTER FROM d)::SMALLINT as quarter,
  
  -- quarter_name
  'Q' || EXTRACT(QUARTER FROM d)::TEXT as quarter_name,
  
  -- quarter_start
  DATE_TRUNC('quarter', d)::DATE as quarter_start,
  
  -- quarter_end
  (DATE_TRUNC('quarter', d) + INTERVAL '3 months' - INTERVAL '1 day')::DATE as quarter_end,
  
  -- year
  EXTRACT(YEAR FROM d)::INTEGER as year,
  
  -- year_start
  DATE_TRUNC('year', d)::DATE as year_start,
  
  -- year_end
  (DATE_TRUNC('year', d) + INTERVAL '1 year' - INTERVAL '1 day')::DATE as year_end,
  
  -- is_leap_year
  is_leap_year(EXTRACT(YEAR FROM d)::INTEGER) as is_leap_year,
  
  -- academic_year (Aug-Jul, e.g., Aug 2024 = '2024-2025')
  CASE 
    WHEN EXTRACT(MONTH FROM d) >= 8 THEN 
      EXTRACT(YEAR FROM d)::TEXT || '-' || (EXTRACT(YEAR FROM d) + 1)::TEXT
    ELSE 
      (EXTRACT(YEAR FROM d) - 1)::TEXT || '-' || EXTRACT(YEAR FROM d)::TEXT
  END as academic_year,
  
  -- academic_semester (1=Fall Aug-Dec, 2=Spring Jan-Jul)
  CASE 
    WHEN EXTRACT(MONTH FROM d) BETWEEN 8 AND 12 THEN 1
    ELSE 2
  END::SMALLINT as academic_semester,
  
  -- is_summer_break (July)
  EXTRACT(MONTH FROM d) = 7 as is_summer_break,
  
  -- is_us_federal_holiday
  is_us_federal_holiday(d) as is_us_federal_holiday,
  
  -- us_holiday_name
  get_us_holiday_name(d) as us_holiday_name,
  
  -- fiscal_year (calendar aligned)
  EXTRACT(YEAR FROM d)::INTEGER as fiscal_year,
  
  -- fiscal_quarter
  EXTRACT(QUARTER FROM d)::SMALLINT as fiscal_quarter,
  
  -- fiscal_month
  EXTRACT(MONTH FROM d)::SMALLINT as fiscal_month

FROM generate_series('2020-01-01'::DATE, '2029-12-31'::DATE, '1 day') as d
ON CONFLICT (date_key) DO NOTHING;

-- Verify row count (should be 3652 or 3653 days)
SELECT COUNT(*) as total_dates, 
       MIN(full_date) as first_date, 
       MAX(full_date) as last_date 
FROM dim_time;

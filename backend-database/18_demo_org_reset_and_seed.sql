-- =============================================================================
-- DEMO: Organizational reset + seed (February–March 2026 only; no April data)
-- =============================================================================
-- DESTRUCTIVE: Deletes all employees and cascaded HR data, clears leave rows,
-- and clears training program enrollee JSON. Run only on a dev/demo project.
-- After run: log in as admin — first admin_accounts row is updated to Donna
-- C. Cuyos (Business Manager / Marketing Head). Employee demo password: sunstar1
-- =============================================================================

-- 1) Clear stale training enrollees (JSON), not necessarily deleting programs
UPDATE public.training_programs SET enrollees = '[]'::jsonb;

-- 2) Leave attachments then leave requests (employee FK may SET NULL on delete)
DELETE FROM public.leave_attachments;
DELETE FROM public.leave_requests;

-- 3) All employees (CASCADE removes attendance, performance, peer reviews, etc.)
DELETE FROM public.employees;

-- 4) Primary admin portal identity (lowest id); adjust in SQL if you use another row
UPDATE public.admin_accounts
SET
  full_name = 'Donna C. Cuyos',
  role = 'Business Manager / Marketing Head'
WHERE id = (SELECT id FROM public.admin_accounts ORDER BY id ASC LIMIT 1);

-- 5) Seven employees (stable ids 1001–1007)
INSERT INTO public.employees (
  id, first_name, last_name, middle_name, age, gender, contact, address,
  last_title, date_started, role, salary,
  emergency_name, emergency_contact, emergency_relation,
  email, password,
  date_hired, employment_status, employment_history, role_history
) VALUES
(1001, 'Donna', 'Cuyos', 'C.', 42, 'Female', '+63 917 000 1001', 'Davao City', 'Business Manager', '2018-01-15', 'Business Manager / Marketing Head', 78000.00,
 'R. Cuyos', '+63 917 000 2001', 'Spouse', 'donna.cuyos@sunstar.demo', 'sunstar1',
 '2018-01-15', 'Active', '[]'::jsonb,
 '[{"ds":"2018-01","de":"","role":"Business Manager / Marketing Head","salary":"78000"}]'::jsonb),
(1002, 'Cristina', 'Alivio', 'E.', 45, 'Female', '+63 917 000 1002', 'Davao City', 'Editor-in-Chief', '2016-06-01', 'Editor-in-Chief', 82000.00,
 'J. Alivio', '+63 917 000 2002', 'Spouse', 'cristina.alivio@sunstar.demo', 'sunstar1',
 '2016-06-01', 'Active', '[]'::jsonb,
 '[{"ds":"2016-06","de":"","role":"Editor-in-Chief","salary":"82000"}]'::jsonb),
(1003, 'Prince', 'Agustin', NULL, 34, 'Male', '+63 917 000 1003', 'Davao City', 'ICT Specialist', '2019-03-10', 'ICT', 55000.00,
 'L. Agustin', '+63 917 000 2003', 'Parent', 'prince.agustin@sunstar.demo', 'sunstar1',
 '2019-03-10', 'Active', '[]'::jsonb,
 '[{"ds":"2019-03","de":"","role":"ICT","salary":"55000"}]'::jsonb),
(1004, 'Margie', 'Abordo', NULL, 48, 'Female', '+63 917 000 1004', 'Davao City', 'HR Manager', '2015-09-01', 'HR Head', 72000.00,
 'T. Abordo', '+63 917 000 2004', 'Spouse', 'margie.abordo@sunstar.demo', 'sunstar1',
 '2015-09-01', 'Active', '[]'::jsonb,
 '[{"ds":"2015-09","de":"","role":"HR Head","salary":"72000"}]'::jsonb),
(1005, 'Maria', 'Quintos', 'Victoneta', 38, 'Female', '+63 917 000 1005', 'Davao City', 'Graphic Artist', '2020-02-17', 'Graphic Artist', 42000.00,
 'A. Quintos', '+63 917 000 2005', 'Sibling', 'maria.quintos@sunstar.demo', 'sunstar1',
 '2020-02-17', 'Active', '[]'::jsonb,
 '[{"ds":"2020-02","de":"","role":"Graphic Artist","salary":"42000"}]'::jsonb),
(1006, 'Arnel', 'Ado', NULL, 36, 'Male', '+63 917 000 1006', 'Davao City', 'Graphic Artist', '2021-07-05', 'Graphic Artist', 41000.00,
 'S. Ado', '+63 917 000 2006', 'Spouse', 'arnel.ado@sunstar.demo', 'sunstar1',
 '2021-07-05', 'Active', '[]'::jsonb,
 '[{"ds":"2021-07","de":"","role":"Graphic Artist","salary":"41000"}]'::jsonb),
(1007, 'Marianne', 'Abalayan', NULL, 40, 'Female', '+63 917 000 1007', 'Davao City', 'Editor', '2017-11-20', 'Editor', 48000.00,
 'K. Abalayan', '+63 917 000 2007', 'Spouse', 'marianne.abalayan@sunstar.demo', 'sunstar1',
 '2017-11-20', 'Active', '[]'::jsonb,
 '[{"ds":"2017-11","de":"","role":"Editor","salary":"48000"}]'::jsonb);

-- 6) Attendance: 2026-02-01 .. 2026-03-31 (weekends mostly absent; weekday lates/absences)
INSERT INTO public.attendance_records (work_date, employee_id, employee_name, clock_in, clock_out, status, shift_schedule)
SELECT
  gs.d::date,
  e.id,
  CASE e.id
    WHEN 1001 THEN 'Donna C. Cuyos'
    WHEN 1002 THEN 'Cristina E. Alivio'
    WHEN 1003 THEN 'Prince Agustin'
    WHEN 1004 THEN 'Margie Abordo'
    WHEN 1005 THEN 'Maria Victoneta Quintos'
    WHEN 1006 THEN 'Arnel Ado'
    WHEN 1007 THEN 'Marianne Abalayan'
  END,
  CASE
    WHEN extract(isodow FROM gs.d::date) IN (6, 7) THEN '--'
    WHEN (extract(day FROM gs.d::date) + e.id) % 19 = 0 THEN '--'
    WHEN extract(isodow FROM gs.d::date) = 1
      AND (e.id % 5) = ((extract(week FROM gs.d::date)::integer + e.id) % 5) THEN '08:24 AM'
    ELSE '08:00 AM'
  END,
  CASE
    WHEN extract(isodow FROM gs.d::date) IN (6, 7) THEN '--'
    WHEN (extract(day FROM gs.d::date) + e.id) % 19 = 0 THEN '--'
    WHEN extract(isodow FROM gs.d::date) = 1
      AND (e.id % 5) = ((extract(week FROM gs.d::date)::integer + e.id) % 5) THEN '05:10 PM'
    ELSE '05:00 PM'
  END,
  CASE
    WHEN extract(isodow FROM gs.d::date) IN (6, 7) THEN 'Absent'
    WHEN (extract(day FROM gs.d::date) + e.id) % 19 = 0 THEN 'Absent'
    WHEN extract(isodow FROM gs.d::date) = 1
      AND (e.id % 5) = ((extract(week FROM gs.d::date)::integer + e.id) % 5) THEN 'Late'
    ELSE 'Present'
  END,
  'Newsroom Day Shift (08:00 AM - 05:00 PM)'
FROM generate_series('2026-02-01'::date, '2026-03-31'::date, interval '1 day') AS gs(d)
CROSS JOIN public.employees e
WHERE e.id BETWEEN 1001 AND 1007;

-- 7) Leave requests (two per employee; ids explicit; dates within Feb–Mar 2026)
INSERT INTO public.leave_requests (
  id, employee_id, employee_name, date_filed, date_of_leave, date_from, date_to,
  reason, note, days, documents, status, time_filed
) VALUES
(300001, 1001, 'Donna C. Cuyos', '2026-02-03', '2026-02-05', '2026-02-05', '2026-02-06', 'Family travel', NULL, 2, '[]'::jsonb, 'Approved', '09:10 AM'),
(300002, 1001, 'Donna C. Cuyos', '2026-03-12', '2026-03-14', '2026-03-14', '2026-03-14', 'Medical appointment', NULL, 1, '[]'::jsonb, 'Pending', '08:05 AM'),
(300003, 1002, 'Cristina E. Alivio', '2026-02-08', '2026-02-10', '2026-02-10', '2026-02-11', 'Editorial summit', NULL, 2, '[]'::jsonb, 'Approved', '04:30 PM'),
(300004, 1002, 'Cristina E. Alivio', '2026-03-20', '2026-03-24', '2026-03-24', '2026-03-25', 'Personal leave', NULL, 2, '[]'::jsonb, 'Declined', '10:00 AM'),
(300005, 1003, 'Prince Agustin', '2026-02-14', '2026-02-17', '2026-02-17', '2026-02-17', 'ICT vendor visit', NULL, 1, '[]'::jsonb, 'Approved', '11:15 AM'),
(300006, 1003, 'Prince Agustin', '2026-03-05', '2026-03-07', '2026-03-07', '2026-03-09', 'Sick leave', 'Flu symptoms', 3, '[]'::jsonb, 'Pending', '07:45 AM'),
(300007, 1004, 'Margie Abordo', '2026-02-01', '2026-02-03', '2026-02-03', '2026-02-03', 'HR offsite', NULL, 1, '[]'::jsonb, 'Approved', '03:00 PM'),
(300008, 1004, 'Margie Abordo', '2026-03-18', '2026-03-21', '2026-03-21', '2026-03-22', 'Bereavement', NULL, 2, '[]'::jsonb, 'Approved', '02:20 PM'),
(300009, 1005, 'Maria Victoneta Quintos', '2026-02-19', '2026-02-21', '2026-02-21', '2026-02-21', 'Creative workshop', NULL, 1, '[]'::jsonb, 'Approved', '09:00 AM'),
(300010, 1005, 'Maria Victoneta Quintos', '2026-03-08', '2026-03-10', '2026-03-10', '2026-03-10', 'Vacation leave', NULL, 1, '[]'::jsonb, 'Pending', '08:50 AM'),
(300011, 1006, 'Arnel Ado', '2026-02-11', '2026-02-13', '2026-02-13', '2026-02-14', 'Family occasion', NULL, 2, '[]'::jsonb, 'Approved', '01:10 PM'),
(300012, 1006, 'Arnel Ado', '2026-03-25', '2026-03-27', '2026-03-27', '2026-03-27', 'Dental procedure', NULL, 1, '[]'::jsonb, 'Declined', '10:30 AM'),
(300013, 1007, 'Marianne Abalayan', '2026-02-22', '2026-02-24', '2026-02-24', '2026-02-25', 'Child care', NULL, 2, '[]'::jsonb, 'Approved', '08:15 AM'),
(300014, 1007, 'Marianne Abalayan', '2026-03-02', '2026-03-04', '2026-03-04', '2026-03-04', 'Half-day personal', NULL, 1, '[]'::jsonb, 'Pending', '04:45 PM');

-- 8) Special attendance requests (two per employee; Feb–Mar 2026)
INSERT INTO public.attendance_special_requests (
  employee_id, employee_name, request_date, request_date_to, request_type, requested_hours,
  shift_schedule, reason, status, decision_note, decided_by, decided_at
) VALUES
(1001, 'Donna C. Cuyos', '2026-02-12', '2026-02-12', 'Official Business', 3.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Client presentation downtown', 'Approved', 'Budget code confirmed', 'HR', now()),
(1001, 'Donna C. Cuyos', '2026-03-16', '2026-03-16', 'Overtime', 2.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Press event coverage wrap-up', 'Pending', NULL, NULL, NULL),
(1002, 'Cristina E. Alivio', '2026-02-18', '2026-02-18', 'Special Work', 4.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Election night special edition', 'Approved', 'Newsroom priority', 'HR', now()),
(1002, 'Cristina E. Alivio', '2026-03-09', '2026-03-09', 'Overtime', 1.5, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Late desk sign-off', 'Declined', 'Use comp credit instead', 'HR', now()),
(1003, 'Prince Agustin', '2026-02-06', '2026-02-06', 'Overtime', 2.5, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Server migration window', 'Approved', 'Scheduled maintenance', 'HR', now()),
(1003, 'Prince Agustin', '2026-03-22', '2026-03-22', 'Official Business', 5.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Vendor security audit', 'Pending', NULL, NULL, NULL),
(1004, 'Margie Abordo', '2026-02-20', '2026-02-20', 'Special Work', 2.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Benefits briefing after hours', 'Approved', 'HR-led session', 'HR', now()),
(1004, 'Margie Abordo', '2026-03-11', '2026-03-11', 'Overtime', 1.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Payroll cut-off support', 'Approved', 'Peak period', 'HR', now()),
(1005, 'Maria Victoneta Quintos', '2026-02-25', '2026-02-25', 'Overtime', 3.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Supplement layout deadline', 'Approved', 'Issue close', 'HR', now()),
(1005, 'Maria Victoneta Quintos', '2026-03-19', '2026-03-19', 'Special Work', 2.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Brand refresh shoot', 'Pending', NULL, NULL, NULL),
(1006, 'Arnel Ado', '2026-02-07', '2026-02-07', 'Official Business', 4.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Field photo coverage', 'Approved', 'City hall event', 'HR', now()),
(1006, 'Arnel Ado', '2026-03-03', '2026-03-03', 'Overtime', 2.0, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Late infographic delivery', 'Declined', 'Reschedule next sprint', 'HR', now()),
(1007, 'Marianne Abalayan', '2026-02-15', '2026-02-15', 'Special Work', 2.5, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Proofing weekend edition', 'Approved', 'Desk coverage arranged', 'HR', now()),
(1007, 'Marianne Abalayan', '2026-03-28', '2026-03-28', 'Official Business', 3.5, 'Newsroom Day Shift (08:00 AM - 05:00 PM)', 'Courthouse hearing notes', 'Pending', NULL, NULL, NULL);

-- 9) Performance records
INSERT INTO public.performance_records (id, employee_name, role, profile_pic, manager_rating, peer_avg, breakdown, comments) VALUES
(1001, 'Donna C. Cuyos', 'Business Manager / Marketing Head', NULL, 4.6, 4.4, '{"quality":4.5,"collaboration":4.7,"initiative":4.6}'::jsonb, 'Strong leadership on cross-desk campaigns.'),
(1002, 'Cristina E. Alivio', 'Editor-in-Chief', NULL, 4.8, 4.6, '{"quality":4.9,"collaboration":4.7,"initiative":4.8}'::jsonb, 'Consistent editorial standards and mentoring.'),
(1003, 'Prince Agustin', 'ICT', NULL, 4.3, 4.1, '{"quality":4.2,"collaboration":4.0,"initiative":4.5}'::jsonb, 'Reliable uptime and responsive support.'),
(1004, 'Margie Abordo', 'HR Head', NULL, 4.5, 4.3, '{"quality":4.4,"collaboration":4.6,"initiative":4.4}'::jsonb, 'Clear policies and fair handling of cases.'),
(1005, 'Maria Victoneta Quintos', 'Graphic Artist', NULL, 4.2, 4.0, '{"quality":4.3,"collaboration":3.9,"initiative":4.2}'::jsonb, 'Creative layouts; tighten turnaround on dailies.'),
(1006, 'Arnel Ado', 'Graphic Artist', NULL, 4.0, 3.9, '{"quality":4.1,"collaboration":3.8,"initiative":4.0}'::jsonb, 'Good photo treatment; continue upskilling on motion.'),
(1007, 'Marianne Abalayan', 'Editor', NULL, 4.4, 4.2, '{"quality":4.5,"collaboration":4.1,"initiative":4.3}'::jsonb, 'Sharp copy edits; proactive on fact-checks.');

-- 10) Manager reviews (averages match rounded one-decimal averages)
INSERT INTO public.manager_reviews (employee_id, employee_name, leadership, communication, support, average, comment) VALUES
(1001, 'Donna C. Cuyos', 5, 5, 4, 4.7, 'Sets clear priorities for marketing pushes.'),
(1002, 'Cristina E. Alivio', 5, 5, 5, 5.0, 'Anchors newsroom quality under pressure.'),
(1003, 'Prince Agustin', 4, 4, 4, 4.0, 'Keeps systems stable; document runbooks more.'),
(1004, 'Margie Abordo', 5, 4, 5, 4.7, 'Trusted HR partner for managers.'),
(1005, 'Maria Victoneta Quintos', 4, 4, 4, 4.0, 'Elevate visual storytelling on digital.'),
(1006, 'Arnel Ado', 4, 3, 4, 3.7, 'Solid teammate; improve deadline communication.'),
(1007, 'Marianne Abalayan', 4, 5, 4, 4.3, 'Detail-oriented editor; great collaborator.');

-- 11) Peer reviews (sparse, no self-reviews)
INSERT INTO public.peer_reviews (reviewer_id, target_id, rating) VALUES
(1002, 1001, 5), (1002, 1003, 4), (1002, 1004, 5),
(1003, 1001, 4), (1003, 1004, 4), (1003, 1007, 5),
(1004, 1001, 4), (1004, 1002, 5), (1004, 1003, 4),
(1001, 1004, 5), (1001, 1007, 4),
(1005, 1006, 4), (1006, 1005, 4),
(1007, 1001, 4), (1007, 1002, 5), (1005, 1001, 4), (1006, 1001, 4), (1007, 1005, 4);

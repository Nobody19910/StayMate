-- Allow admins to delete bookings (inquiries)
DROP POLICY IF EXISTS "Admin can delete all bookings" ON public.bookings;
CREATE POLICY "Admin can delete all bookings"
    ON public.bookings FOR DELETE
    USING (public.is_admin());

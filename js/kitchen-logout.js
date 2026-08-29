import { supabase } from './supabase.js'

/*
=========================================================
CHAIXI BAMEEKIAO POS MAIN
KITCHEN LOGOUT V2.15.2
=========================================================
- เฉพาะ role = kitchen จะแสดงปุ่ม "ออกจากระบบ"
- role kitchen จะซ่อนปุ่ม Dashboard
- Admin / Manager ยังเห็น Dashboard ตามเดิม
- Sign out แล้วกลับหน้า Login
=========================================================
*/

const logoutBtn =
    document.getElementById(
        'kitchenLogoutBtn'
    )

const backBtn =
    document.getElementById(
        'backBtn'
    )


async function setupKitchenLogout() {

    try {

        const {
            data: {
                session
            },
            error: sessionError
        } =
            await supabase
                .auth
                .getSession()


        if (sessionError) {
            throw sessionError
        }


        if (!session) {
            return
        }


        const {
            data: profile,
            error: profileError
        } =
            await supabase
                .from(
                    'profiles'
                )
                .select(
                    'role,is_active'
                )
                .eq(
                    'id',
                    session.user.id
                )
                .maybeSingle()


        if (profileError) {
            throw profileError
        }


        const role =
            String(
                profile?.role ||
                ''
            )
                .trim()
                .toLowerCase()


        /*
         * แสดงปุ่ม Logout เฉพาะพนักงานครัว
         */
        if (
            role ===
            'kitchen'
        ) {

            if (logoutBtn) {
                logoutBtn.hidden =
                    false
            }


            /*
             * Kitchen ไม่มีสิทธิ์ Dashboard
             * จึงซ่อนปุ่ม Dashboard เพื่อไม่ให้กดแล้วงง
             */
            if (backBtn) {
                backBtn.style.display =
                    'none'
            }
        }


    } catch (error) {

        console.error(
            'Kitchen logout setup error:',
            error
        )
    }
}


logoutBtn
    ?.addEventListener(
        'click',
        async () => {

            const confirmed =
                window.confirm(
                    'ออกจากระบบครัวใช่หรือไม่?'
                )


            if (!confirmed) {
                return
            }


            logoutBtn.disabled =
                true

            logoutBtn.textContent =
                'กำลังออก...'


            try {

                await supabase
                    .auth
                    .signOut()


            } catch (error) {

                console.error(
                    'Kitchen logout error:',
                    error
                )


            } finally {

                window.location
                    .replace(
                        './index.html'
                    )
            }
        }
    )


setupKitchenLogout()

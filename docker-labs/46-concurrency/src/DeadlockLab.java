import java.lang.management.ManagementFactory;
import java.util.concurrent.*;
import java.util.concurrent.locks.ReentrantLock;

final class DeadlockLab {
    static boolean broken() throws InterruptedException {
        ReentrantLock stock = new ReentrantLock(), wallet = new ReentrantLock();
        CountDownLatch bothHoldOne = new CountDownLatch(2);
        Thread a = worker(stock, wallet, bothHoldOne, "stock-then-wallet");
        Thread b = worker(wallet, stock, bothHoldOne, "wallet-then-stock");
        a.start(); b.start();
        try {
            LabSupport.await(bothHoldOne);
            LabSupport.until(() -> {
                long[] ids = ManagementFactory.getThreadMXBean().findDeadlockedThreads();
                if (ids == null) return false;
                boolean foundA = false, foundB = false;
                for (long id : ids) {
                    if (id == a.threadId()) foundA = true;
                    if (id == b.threadId()) foundB = true;
                }
                return foundA && foundB;
            }, "Ownable-synchronizer deadlock was not detected");
            return true;
        } finally {
            // lockInterruptibly permits controlled recovery; plain lock() would not.
            a.interrupt(); b.interrupt();
            LabSupport.join(a); LabSupport.join(b);
        }
    }

    private static Thread worker(ReentrantLock first, ReentrantLock second, CountDownLatch ready, String name) {
        Thread t = new Thread(() -> {
            try {
                first.lockInterruptibly();
                try {
                    ready.countDown();
                    LabSupport.await(ready);
                    second.lockInterruptibly();
                    try { /* Opposite order deliberately prevents reaching this point. */ }
                    finally { second.unlock(); }
                } finally { first.unlock(); }
            } catch (InterruptedException expected) {
                Thread.currentThread().interrupt();
            }
        }, name);
        t.setDaemon(true);
        return t;
    }

    static int ordered() throws InterruptedException {
        ReentrantLock stock = new ReentrantLock(), wallet = new ReentrantLock();
        java.util.concurrent.atomic.AtomicInteger completed = new java.util.concurrent.atomic.AtomicInteger();
        Runnable job = () -> {
            stock.lock();
            try {
                wallet.lock();
                try { completed.incrementAndGet(); }
                finally { wallet.unlock(); }
            } finally { stock.unlock(); }
        };
        Thread a = new Thread(job), b = new Thread(job);
        a.start(); b.start(); LabSupport.join(a); LabSupport.join(b);
        return completed.get();
    }

    static void run() throws InterruptedException {
        System.out.println("ASLI JAVA THREADS; opposite lock order, interruptible cleanup");
        System.out.println("deadlock detected=" + broken() + "; demo threads stopped");
        System.out.println("same lock order: completed=" + ordered() + "/2");
        System.out.println("MODEL livelock: 4 rounds dono raasta badalte rahe; completed=0");
        System.out.println("MODEL starvation: 4 premium jobs chune; normal job waiting=4 rounds");
        System.out.println("Finite model trace infinite starvation prove nahi karti; selection rule ko dekho.");
    }
}

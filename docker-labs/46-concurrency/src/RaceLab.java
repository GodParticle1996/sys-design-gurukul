import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

final class RaceLab {
    // volatile makes each read/write visible; read + add + write still is not one atomic operation.
    private volatile int value;
    private final ReentrantLock lock = new ReentrantLock();

    int lostUpdate() throws InterruptedException {
        value = 0;
        CountDownLatch bothRead = new CountDownLatch(2);
        Runnable increment = () -> {
            int before = value;
            bothRead.countDown();
            try {
                LabSupport.await(bothRead);
                value = before + 1;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };
        Thread a = new Thread(increment, "A"), b = new Thread(increment, "B");
        a.start(); b.start();
        LabSupport.join(a); LabSupport.join(b);
        return value;
    }

    void incrementLocked() {
        lock.lock();
        try {
            value = value + 1;
        } finally {
            lock.unlock();
        }
    }

    int withMutex() throws InterruptedException {
        value = 0;
        Thread a = new Thread(this::incrementLocked), b = new Thread(this::incrementLocked);
        a.start(); b.start();
        LabSupport.join(a); LabSupport.join(b);
        return value;
    }

    static int withAtomic() throws InterruptedException {
        AtomicInteger count = new AtomicInteger();
        Thread a = new Thread(count::incrementAndGet), b = new Thread(count::incrementAndGet);
        a.start(); b.start();
        LabSupport.join(a); LabSupport.join(b);
        return count.get();
    }

    static String reentrant() {
        ReentrantLock lock = new ReentrantLock();
        lock.lock();
        try {
            lock.lock();
            try {
                LabSupport.require(lock.getHoldCount() == 2, "Nested acquisition count");
            } finally {
                lock.unlock();
            }
            LabSupport.require(lock.getHoldCount() == 1, "One unlock must leave one hold");
        } finally {
            lock.unlock();
        }
        return "holds=2 -> 1 -> 0";
    }

    // A controlled lock-availability experiment, not a throughput benchmark.
    static boolean otherKeyCanEnter(boolean coarse) throws InterruptedException {
        ReentrantLock keyA = new ReentrantLock();
        ReentrantLock keyB = coarse ? keyA : new ReentrantLock();
        AtomicInteger entered = new AtomicInteger();
        keyA.lock();
        try {
            Thread b = new Thread(() -> {
                if (keyB.tryLock()) {
                    try { entered.incrementAndGet(); }
                    finally { keyB.unlock(); }
                }
            });
            b.start(); LabSupport.join(b);
        } finally {
            keyA.unlock();
        }
        return entered.get() == 1;
    }

    static boolean immutableSnapshot() {
        List<String> mutable = new ArrayList<>(List.of("Asha"));
        List<String> snapshot = List.copyOf(mutable);
        mutable.add("Kabir");
        try {
            snapshot.add("Mira");
            throw new AssertionError("Snapshot allowed mutation");
        } catch (UnsupportedOperationException expected) {
            return snapshot.equals(List.of("Asha"));
        }
    }

    static void run() throws InterruptedException {
        System.out.println("ASLI JAVA THREADS; read barrier jaan-boojhkar lagaya hai");
        RaceLab lab = new RaceLab();
        System.out.println("broken: expected=2 actual=" + lab.lostUpdate());
        System.out.println("mutex: expected=2 actual=" + lab.withMutex());
        System.out.println("atomic increment: expected=2 actual=" + withAtomic());
        System.out.println("reentrant: " + reentrant());
        System.out.println("other key enters: coarse=" + otherKeyCanEnter(true) + " fine=" + otherKeyCanEnter(false));
        System.out.println("immutable snapshot unchanged=" + immutableSnapshot());
    }
}

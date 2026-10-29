import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

final class PoolLab {
    // Logical connection IDs only. No database/socket is opened by this lab.
    static final class Pool {
        private final Semaphore permits;
        private final ConcurrentLinkedQueue<Integer> free = new ConcurrentLinkedQueue<>();
        Pool(int capacity) {
            if (capacity < 1) throw new IllegalArgumentException("capacity must be positive");
            permits = new Semaphore(capacity, true);
            for (int id = 1; id <= capacity; id++) free.add(id);
        }

        Lease borrow(long timeoutMillis) throws InterruptedException {
            if (timeoutMillis < 0) throw new IllegalArgumentException("negative timeout");
            if (!permits.tryAcquire(timeoutMillis, TimeUnit.MILLISECONDS)) return null;
            Integer id = free.poll();
            if (id == null) {
                permits.release();
                throw new IllegalStateException("Permit without a free connection");
            }
            return new Lease(id, this);
        }

        int available() { return permits.availablePermits(); }
        int freeCount() { return free.size(); }
    }

    static final class Lease implements AutoCloseable {
        final int id;
        private final Pool owner;
        private final AtomicBoolean closed = new AtomicBoolean();
        Lease(int id, Pool owner) { this.id = id; this.owner = owner; }
        public void close() {
            if (closed.compareAndSet(false, true)) {
                owner.free.add(id);
                owner.permits.release();
            }
        }
    }

    static void run() throws InterruptedException {
        Pool pool = new Pool(2);
        System.out.println("LOGICAL CONNECTIONS; asli Semaphore, DB/socket nahi");
        Pool leaked = new Pool(2);
        Lease forgotten = leaked.borrow(0);
        System.out.println("broken missing close: permits=" + leaked.available() + "/2");
        forgotten.close();
        Semaphore raw = new Semaphore(2);
        raw.acquire(); raw.release(); raw.release();
        System.out.println("broken raw double release: permits=" + raw.availablePermits() + "/2");
        try (Lease a = pool.borrow(0); Lease b = pool.borrow(0)) {
            LabSupport.require(a != null && b != null, "Initial borrow failed");
            System.out.println("borrowed=" + a.id + "," + b.id + " permits=" + pool.available());
            System.out.println("third borrow with 20 ms deadline=" + (pool.borrow(20) == null ? "timed out" : "BUG"));
        }
        try {
            try (Lease lease = pool.borrow(0)) {
                LabSupport.require(lease != null, "Borrow after return failed");
                throw new IllegalStateException("Simulated query failure");
            }
        } catch (IllegalStateException expected) {
            LabSupport.require(expected.getMessage().equals("Simulated query failure"), "Unexpected pool failure");
        }
        Lease lease = pool.borrow(0);
        LabSupport.require(lease != null, "Borrow for duplicate-close check failed");
        lease.close(); lease.close();
        System.out.println("after failure + double close: permits=" + pool.available() + " free=" + pool.freeCount());
    }
}

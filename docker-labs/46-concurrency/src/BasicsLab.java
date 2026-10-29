import java.nio.file.Path;
import java.util.concurrent.*;

final class BasicsLab {
    static int shared;

    static void run() throws Exception {
        System.out.println("MODEL: ek core A/B ka kaam baari-baari chala sakta hai; do cores zaroori nahi.");
        System.out.println("ASLI JAVA PLATFORM THREADS; JVM states, OS scheduler measurement nahi");
        Object monitor = new Object();
        CountDownLatch finish = new CountDownLatch(1);
        Thread thread = new Thread(() -> {
            synchronized (monitor) {
                try { LabSupport.await(finish); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }
        }, "state-demo");
        thread.setDaemon(true);
        System.out.println("before start=" + thread.getState());
        try {
            synchronized (monitor) {
                thread.start();
                LabSupport.until(() -> thread.getState() == Thread.State.BLOCKED, "Monitor waiter not blocked");
                System.out.println("monitor held by main=" + thread.getState());
            }
            LabSupport.until(() -> thread.getState() == Thread.State.TIMED_WAITING, "Latch waiter not waiting");
            System.out.println("timed latch await=" + thread.getState());
        } finally {
            finish.countDown(); thread.interrupt(); LabSupport.join(thread);
        }
        System.out.println("after join=" + thread.getState());
        shared = 0;
        Thread writer = new Thread(() -> shared = 7);
        writer.start(); LabSupport.join(writer);
        System.out.println("thread changed parent field=" + shared);
        Process child = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
            "-cp", System.getProperty("java.class.path"), "LabRunner", "child-memory").start();
        try {
            LabSupport.require(child.waitFor(3, TimeUnit.SECONDS), "Child process timeout");
            LabSupport.require(child.exitValue() == 0, "Child process failed");
            System.out.print(new String(child.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
        } finally { child.destroyForcibly(); }
        System.out.println("Java RUNNABLE mein ready ya CPU par chal raha thread ho sakta hai; alag RUNNING enum nahi.");
    }
}
